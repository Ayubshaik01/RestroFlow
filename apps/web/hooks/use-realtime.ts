"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { realtimeInvalidations } from "@/lib/realtime-keys";
import { setRealtimeState } from "@/lib/realtime-status";

/**
 * Connects to Supabase Realtime channels for the active restaurant branch.
 * Listens for live changes on orders, kitchen tickets (KOTs), tables, and reservations,
 * invalidating relevant TanStack Query caches instantly without manual polling.
 */
export function useRealtime(branchId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!branchId || !isSupabaseConfigured()) {
      setRealtimeState("offline");
      return;
    }

    setRealtimeState("connecting");

    const channel = supabase
      .channel(`realtime-branch-${branchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `branch_id=eq.${branchId}`,
        },
        () => {
          realtimeInvalidations("order.updated", branchId).forEach((queryKey) =>
            queryClient.invalidateQueries({ queryKey }),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "kots",
        },
        () => {
          realtimeInvalidations("kot.updated", branchId).forEach((queryKey) =>
            queryClient.invalidateQueries({ queryKey }),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tables",
        },
        () => {
          realtimeInvalidations("table.updated", branchId).forEach((queryKey) =>
            queryClient.invalidateQueries({ queryKey }),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reservations",
          filter: `branch_id=eq.${branchId}`,
        },
        () => {
          realtimeInvalidations("reservation.updated", branchId).forEach((queryKey) =>
            queryClient.invalidateQueries({ queryKey }),
          );
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setRealtimeState("live");
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          setRealtimeState("offline");
        }
      });

    return () => {
      void supabase.removeChannel(channel);
      setRealtimeState("offline");
    };
  }, [branchId, queryClient]);
}
