"use client";

import { Bell, CheckCheck, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBranch } from "@/hooks/use-branch";
import { useNotificationMute } from "@/hooks/use-notification-mute";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  type NotificationEntry,
} from "@/hooks/use-notifications";
import { openEntity } from "@/lib/entity-events";
import { playNotificationFeedback } from "@/lib/notification-feedback";

const socketAnnounce = { pending: 0 };

function timeAgo(iso: string): string {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function NotificationBell() {
  const { branchId } = useBranch();
  const queryClient = useQueryClient();
  const { data } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const [muted, toggleMuted] = useNotificationMute();
  const mutedRef = useRef(muted);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  useEffect(() => {
    if (!branchId || !isSupabaseConfigured()) return;

    const channel = supabase
      .channel(`bell-notifications-${branchId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `branch_id=eq.${branchId}`,
        },
        () => {
          socketAnnounce.pending += 1;
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
          if (!mutedRef.current) playNotificationFeedback();
        },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.debug("Notification bell realtime status:", status);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [branchId, queryClient]);

  const announced = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!data) return;
    if (announced.current === null) {
      announced.current = new Set(data.data.map((n) => n.id));
      return;
    }
    const fresh = data.data.filter((n) => !n.readAt && !announced.current!.has(n.id));
    fresh.forEach((n) => announced.current!.add(n.id));
    const skip = Math.min(socketAnnounce.pending, fresh.length);
    socketAnnounce.pending -= skip;
    const toAnnounce = fresh.slice(skip);
    if (toAnnounce.length === 0) return;
    if (!mutedRef.current) playNotificationFeedback();
  }, [data]);

  const unreadCount = data?.unreadCount ?? 0;
  const notifications = data?.data ?? [];

  const handleSelect = (notification: NotificationEntry) => {
    if (!notification.readAt) markRead.mutate(notification.id);
    if (
      (notification.entity === "Order" || notification.entity === "Reservation") &&
      notification.entityId
    ) {
      openEntity(notification.entity, notification.entityId);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary"
            aria-label={
              unreadCount > 0
                ? `Notifications, ${unreadCount} unread`
                : "Notifications"
            }
          >
            <Bell className="h-[18px] w-[18px]" />
            {unreadCount > 0 && (
              <Badge className="absolute -right-1 -top-1 h-4 min-w-4 justify-center rounded-full px-1 text-[10px] leading-none">
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            )}
          </button>
        }
      />
      <DropdownMenuContent align="end" className="w-80 sm:w-96">
        <div className="flex items-center justify-between gap-2 px-1.5 py-1">
          <span className="text-xs font-medium text-muted-foreground">
            Notifications
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                toggleMuted();
              }}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary"
              aria-label={
                muted
                  ? "Unmute notification sound on this device"
                  : "Mute notification sound on this device"
              }
              aria-pressed={muted}
            >
              {muted ? (
                <VolumeX className="h-3.5 w-3.5" />
              ) : (
                <Volume2 className="h-3.5 w-3.5" />
              )}
            </button>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  markAllRead.mutate();
                }}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary"
                aria-label="Mark all notifications read"
              >
                <CheckCheck className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />

        {notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-1 px-3 py-8 text-center">
            <p className="text-sm font-medium text-foreground">
              No notifications yet
            </p>
            <p className="text-xs text-muted-foreground">
              New orders and ready tickets will show up here.
            </p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="min-h-11 flex-col items-start gap-0.5 whitespace-normal px-2 py-2"
                onClick={() => handleSelect(notification)}
              >
                <div className="flex w-full items-center gap-2">
                  {!notification.readAt && (
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                      aria-hidden
                    />
                  )}
                  <span className="truncate text-sm font-medium text-foreground">
                    {notification.title}
                  </span>
                  <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                    {timeAgo(notification.createdAt)}
                  </span>
                </div>
                <p className="pl-0 text-xs text-muted-foreground">
                  {notification.body}
                </p>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
