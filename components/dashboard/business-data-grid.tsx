"use client";

import { motion } from "motion/react";
import { TrendingUp, Receipt, ShoppingBag, Users, ChevronDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import { AnimatedCounter } from "./animated-counter";
import { cn } from "@/lib/utils";

interface BusinessDataProps {
  todayRevenue: number;
  todayOrders: number;
  avgOrderValue: number;
  totalCustomers: number;
  isLoading?: boolean;
}

export function BusinessDataSection({
  todayRevenue,
  todayOrders,
  avgOrderValue,
  totalCustomers,
  isLoading,
}: BusinessDataProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-44 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header with Title and Filter Dropdown */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Business Data
          </h2>
          <p className="text-xs text-muted-foreground">
            Core sales &amp; guest throughput performance
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-2xs">
          <span>Today</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      </div>

      {/* 2x2 Grid matching reference image */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 1. Total Revenue - Vibrant Coral / Orange */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          whileHover={{ scale: 1.02, y: -2 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 p-6 text-white shadow-md shadow-orange-500/20"
        >
          <div className="pointer-events-none absolute -right-6 -bottom-6 h-28 w-28 rounded-full bg-white/10 blur-xl" />
          <div className="relative flex flex-col justify-between h-full gap-4">
            <span className="text-xs font-bold uppercase tracking-wider text-white/90">
              Total Revenue
            </span>
            <div className="flex items-center justify-between gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
                <TrendingUp className="h-5 w-5 stroke-[2.5] text-white" />
              </div>
              <div className="text-right">
                <AnimatedCounter
                  value={todayRevenue}
                  formatFn={(v) => formatCurrency(v)}
                  className="text-2xl font-extrabold tracking-tight tabular-nums text-white md:text-3xl"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* 2. Total Orders - Mint / Spring Green */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          whileHover={{ scale: 1.02, y: -2 }}
          className="relative overflow-hidden rounded-3xl bg-[#71f09c] dark:bg-emerald-600 p-6 text-emerald-950 dark:text-white shadow-md shadow-emerald-500/15"
        >
          <div className="pointer-events-none absolute -right-6 -bottom-6 h-28 w-28 rounded-full bg-white/20 blur-xl" />
          <div className="relative flex flex-col justify-between h-full gap-4">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-900/80 dark:text-emerald-100">
              Total Orders
            </span>
            <div className="flex items-center justify-between gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-900/10 dark:bg-white/20 backdrop-blur-md">
                <Receipt className="h-5 w-5 stroke-[2.5] text-emerald-950 dark:text-white" />
              </div>
              <div className="text-right">
                <AnimatedCounter
                  value={todayOrders}
                  className="text-3xl font-extrabold tracking-tight tabular-nums text-emerald-950 dark:text-white md:text-4xl"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* 3. Average Order Value - Warm Peach / Salmon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          whileHover={{ scale: 1.02, y: -2 }}
          className="relative overflow-hidden rounded-3xl bg-[#fed0b9] dark:bg-orange-950/80 p-6 text-stone-900 dark:text-orange-100 shadow-md shadow-orange-500/10 border border-orange-200/50 dark:border-orange-800/40"
        >
          <div className="pointer-events-none absolute -right-6 -bottom-6 h-28 w-28 rounded-full bg-white/20 blur-xl" />
          <div className="relative flex flex-col justify-between h-full gap-4">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-orange-200/90">
              Average Order Value
            </span>
            <div className="flex items-center justify-between gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/40 dark:bg-orange-800/50 backdrop-blur-md">
                <ShoppingBag className="h-5 w-5 stroke-[2.5] text-stone-800 dark:text-orange-200" />
              </div>
              <div className="text-right">
                <AnimatedCounter
                  value={avgOrderValue}
                  formatFn={(v) => formatCurrency(v)}
                  className="text-2xl font-extrabold tracking-tight tabular-nums text-stone-950 dark:text-white md:text-3xl"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* 4. Number of Customers - Soft Butter Yellow */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          whileHover={{ scale: 1.02, y: -2 }}
          className="relative overflow-hidden rounded-3xl bg-[#fef08a] dark:bg-amber-950/70 p-6 text-stone-900 dark:text-amber-100 shadow-md shadow-amber-500/10 border border-amber-200/60 dark:border-amber-800/40"
        >
          <div className="pointer-events-none absolute -right-6 -bottom-6 h-28 w-28 rounded-full bg-white/30 blur-xl" />
          <div className="relative flex flex-col justify-between h-full gap-4">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-amber-200/90">
              Number of Customers
            </span>
            <div className="flex items-center justify-between gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-stone-900/10 dark:bg-amber-800/50 backdrop-blur-md">
                <Users className="h-5 w-5 stroke-[2.5] text-stone-900 dark:text-amber-200" />
              </div>
              <div className="text-right">
                <AnimatedCounter
                  value={totalCustomers}
                  className="text-3xl font-extrabold tracking-tight tabular-nums text-stone-950 dark:text-white md:text-4xl"
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
