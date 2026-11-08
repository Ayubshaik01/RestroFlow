"use client";

import { motion } from "motion/react";
import { Clock, CookingPot, Utensils, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedCounter } from "./animated-counter";
import { cn } from "@/lib/utils";

interface TodayHeroStatsProps {
  pendingOrders: number;
  inProgressOrders: number;
  availableTables: number;
  totalTables: number;
  completedOrders: number;
  totalOrders: number;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export function TodayHeroStats({
  pendingOrders,
  inProgressOrders,
  availableTables,
  totalTables,
  completedOrders,
  totalOrders,
  isLoading,
  onRefresh,
}: TodayHeroStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-3xl" />
        ))}
      </div>
    );
  }

  const completionPercent =
    totalOrders > 0 ? Math.min(100, Math.round((completedOrders / totalOrders) * 100)) : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Section Title and Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Today&apos;s Data
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time operational pulse across counter, floor & kitchen
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onRefresh}
              className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground shadow-xs hover:text-foreground transition-colors"
              title="Refresh pulse"
            >
              <RefreshCw className="h-4 w-4" />
            </motion.button>
          )}

          <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span>Live Pulse</span>
          </div>
        </div>
      </div>

      {/* Hero Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Pending Orders */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          whileHover={{ y: -3, transition: { duration: 0.2 } }}
        >
          <Card className="flex flex-col justify-between rounded-3xl border border-border/80 bg-card p-5 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                <Clock className="h-6 w-6 stroke-[2.2]" />
              </div>
              <div className="text-right">
                <AnimatedCounter
                  value={pendingOrders}
                  className="text-3xl font-extrabold tracking-tight tabular-nums text-foreground md:text-4xl"
                />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-xs font-medium text-muted-foreground">
                Total Pending Orders
              </span>
              <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                <span>Awaiting kitchen acceptance</span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* 2. Orders in Progress */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          whileHover={{ y: -3, transition: { duration: 0.2 } }}
        >
          <Card className="flex flex-col justify-between rounded-3xl border border-border/80 bg-card p-5 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <CookingPot className="h-6 w-6 stroke-[2.2]" />
              </div>
              <div className="text-right">
                <AnimatedCounter
                  value={inProgressOrders}
                  className="text-3xl font-extrabold tracking-tight tabular-nums text-foreground md:text-4xl"
                />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-xs font-medium text-muted-foreground">
                Orders in Progress
              </span>
              <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <span>Cooking &amp; packing</span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* 3. Available Tables */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          whileHover={{ y: -3, transition: { duration: 0.2 } }}
        >
          <Card className="flex flex-col justify-between rounded-3xl border border-border/80 bg-card p-5 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400">
                <Utensils className="h-6 w-6 stroke-[2.2]" />
              </div>
              <div className="text-right">
                <div className="flex items-baseline justify-end gap-1">
                  <AnimatedCounter
                    value={availableTables}
                    className="text-3xl font-extrabold tracking-tight tabular-nums text-foreground md:text-4xl"
                  />
                  <span className="text-lg font-bold text-muted-foreground">
                    /{totalTables > 0 ? totalTables : 20}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-xs font-medium text-muted-foreground">
                Available Tables
              </span>
              <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-orange-600 dark:text-orange-400">
                <span>Floor readiness</span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* 4. Order Management (Completion & Progress Bar) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          whileHover={{ y: -3, transition: { duration: 0.2 } }}
        >
          <Card className="flex flex-col justify-between rounded-3xl border border-border/80 bg-card p-5 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Order Management
                </span>
                <p className="text-[11px] text-muted-foreground">Fulfillment target</p>
              </div>
              <div className="flex items-baseline gap-1 text-right">
                <AnimatedCounter
                  value={completedOrders}
                  className="text-2xl font-extrabold tracking-tight tabular-nums text-foreground"
                />
                <span className="text-sm font-semibold text-muted-foreground">
                  /{totalOrders}
                </span>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                <span>{completionPercent}% completed</span>
                <span>100%</span>
              </div>

              {/* Multi-segment styled gradient progress bar */}
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary/80 p-0.5">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-emerald-500 shadow-xs"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(6, completionPercent)}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

