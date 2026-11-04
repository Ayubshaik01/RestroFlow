"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { useNotificationMute } from "./use-notification-mute";
import { playNotificationFeedback } from "@/lib/notification-feedback";

/**
 * Kitchen-specific sound alert for new kitchen tickets and incoming orders.
 * Listens to Supabase Realtime postgres_changes on kots and orders tables.
 */
export function useKdsSound(branchId: string | null) {
  const [muted] = useNotificationMute();
  const mutedRef = useRef(muted);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  useEffect(() => {
    if (!branchId) return;

    const chime = () => {
      if (!mutedRef.current) playNotificationFeedback();
    };

    const channel = supabase
      .channel(`kds-sound-${branchId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "kots",
        },
        chime,
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `branch_id=eq.${branchId}`,
        },
        (payload: any) => {
          if (payload.new?.acceptance === "PENDING") chime();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [branchId]);
}
