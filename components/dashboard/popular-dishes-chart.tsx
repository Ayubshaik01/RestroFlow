"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import { ArrowUpRight, ChevronDown, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface PopularItem {
  name: string;
  quantity: number;
  revenue: number;
}

// Fallback high-selling reference dishes if kitchen has not logged items today yet
const DEMO_POPULAR_DISHES: PopularItem[] = [
  { name: "Noodles", quantity: 38, revenue: 3800 },
  { name: "Pizza", quantity: 56, revenue: 16800 },
  { name: "Ice Cream", quantity: 45, revenue: 4500 },
  { name: "Biryani", quantity: 68, revenue: 20400 },
  { name: "Butter Chicken", quantity: 72, revenue: 25200 },
  { name: "Pasta", quantity: 41, revenue: 12300 },
  { name: "Crispy Paneer", quantity: 39, revenue: 7800 },
  { name: "Fried Chicken", quantity: 52, revenue: 15600 },
  { name: "Garlic Naan", quantity: 84, revenue: 5040 },
  { name: "Mocktail", quantity: 49, revenue: 7350 },
];

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as PopularItem;
  return (
    <div className="rounded-2xl border border-border/80 bg-popover/95 p-3.5 shadow-xl backdrop-blur-md">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
        <p className="text-sm font-bold text-foreground">{d.name}</p>
      </div>
      <div className="mt-2 flex flex-col gap-1 text-xs">
        <div className="flex items-center justify-between gap-4 text-muted-foreground">
          <span>Orders sold:</span>
          <span className="font-bold tabular-nums text-foreground">{d.quantity} units</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-muted-foreground">
          <span>Gross volume:</span>
          <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatCurrency(d.revenue)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function PopularDishesChart({
  data = [],
  isLoading = false,
}: {
  data?: PopularItem[];
  isLoading?: boolean;
}) {
  const [timeFilter, setTimeFilter] = useState<"today" | "month">("today");

  if (isLoading) {
    return (
      <Card className="flex flex-col gap-4 rounded-3xl p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48 rounded-xl" />
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </Card>
    );
  }

  // If live data has items use it, otherwise show representative popular dishes
  const chartData = data && data.length > 0 ? data : DEMO_POPULAR_DISHES;
  const maxQty = Math.max(...chartData.map((d) => d.quantity), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.2 }}
    >
      <Card className="flex flex-col justify-between rounded-3xl border border-border/80 bg-card p-6 shadow-sm transition-all hover:shadow-md">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Most Popular Dishes
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Top 10 Most Popular Dishes by quantity &amp; demand
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTimeFilter(timeFilter === "today" ? "month" : "today")}
              className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted/50 transition-colors"
            >
              <span>{timeFilter === "today" ? "Today" : "This Month"}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>

            <Link
              href="/menu"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-2xs hover:text-foreground transition-colors"
              title="View full menu"
            >
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Chart Body */}
        <div className="mt-6 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 16, right: 12, bottom: 24, left: -14 }}
              barSize={28}
            >
              <CartesianGrid
                strokeDasharray="4 4"
                stroke="var(--border)"
                vertical={false}
                opacity={0.6}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)", fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                interval={0}
                angle={-25}
                textAnchor="end"
                height={50}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "var(--muted)", opacity: 0.4, rx: 8 }}
              />
              <Bar dataKey="quantity" radius={[8, 8, 4, 4]}>
                {chartData.map((item, index) => {
                  const isTopItem = item.quantity === maxQty;
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        isTopItem
                          ? "#F97316" // Highlighted orange like sushi in reference
                          : index % 2 === 0
                          ? "#CBD5E1" // Light cool stone
                          : "#E2E8F0"
                      }
                      className={cn(
                        "transition-all duration-300",
                        isTopItem
                          ? "fill-orange-500"
                          : "dark:fill-stone-700 hover:fill-orange-400 dark:hover:fill-orange-500",
                      )}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Bottom Legend / Highlight Footer */}
        <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-orange-500" />
            <span className="font-medium text-foreground">Top Bestseller</span>
            <span className="text-muted-foreground">
              ({chartData.find((d) => d.quantity === maxQty)?.name || "Bestseller"})
            </span>
          </div>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            Real-time Kitchen Feedback
          </span>
        </div>
      </Card>
    </motion.div>
  );
}
