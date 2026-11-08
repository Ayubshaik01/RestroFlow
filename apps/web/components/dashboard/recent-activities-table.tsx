"use client";

import { motion } from "motion/react";
import {
  MoreVertical,
  UtensilsCrossed,
  Clock,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface RecentOrder {
  id: string;
  orderNumber: string;
  type: string;
  totalAmount: string;
  billedAt: string;
  status?: string;
  tableName?: string;
}

interface RecentActivitiesTableProps {
  orders: RecentOrder[];
  branchName?: string;
  isLoading?: boolean;
  onViewOrder: (orderId: string) => void;
}

const FOOD_ICONS = [
  { icon: "🥞", bg: "bg-amber-100 dark:bg-amber-950/60", label: "Pancake Stack" },
  { icon: "🍣", bg: "bg-rose-100 dark:bg-rose-950/60", label: "Salmon Special" },
  { icon: "🍕", bg: "bg-orange-100 dark:bg-orange-950/60", label: "Artisan Pizza" },
  { icon: "🍛", bg: "bg-yellow-100 dark:bg-yellow-950/60", label: "Chef Biryani" },
  { icon: "🥗", bg: "bg-emerald-100 dark:bg-emerald-950/60", label: "Green Harvest" },
];

export function RecentActivitiesTable({
  orders = [],
  branchName = "Active Branch",
  isLoading = false,
  onViewOrder,
}: RecentActivitiesTableProps) {
  if (isLoading) {
    return (
      <Card className="flex flex-col gap-4 rounded-3xl p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48 rounded-xl" />
          <Skeleton className="h-8 w-36 rounded-full" />
        </div>
        <div className="flex flex-col gap-3 mt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card className="flex flex-col rounded-3xl border border-border/80 bg-card p-6 shadow-sm transition-all hover:shadow-md">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-border/60">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Recent Activities
            </h2>
            <p className="text-xs text-muted-foreground">
              Daily live counter selling status &amp; guest orders
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>{branchName}</span>
            </div>

            <Link
              href="/orders"
              className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline px-2"
            >
              <span>View All</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Responsive Table */}
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-muted-foreground">
            <UtensilsCrossed className="h-10 w-10 text-muted-foreground/40 mb-2" />
            <p className="font-semibold text-foreground">No orders recorded yet today</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              New orders taken via POS or QR kiosk will appear here instantly.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border/40 text-xs font-semibold text-muted-foreground">
                  <th className="pb-3.5 pt-4 font-semibold">Product</th>
                  <th className="pb-3.5 pt-4 font-semibold">Table / Channel</th>
                  <th className="pb-3.5 pt-4 font-semibold">Price</th>
                  <th className="pb-3.5 pt-4 font-semibold">Items Code</th>
                  <th className="pb-3.5 pt-4 font-semibold">Priority / Status</th>
                  <th className="pb-3.5 pt-4 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {orders.map((order, idx) => {
                  const food = FOOD_ICONS[idx % FOOD_ICONS.length];
                  const isDineIn = order.type === "DINE_IN";
                  const tableLabel = order.tableName || (isDineIn ? `T-${(idx % 12) + 1}` : order.type.replace("_", " "));
                  const isCompleted = idx % 2 === 0;

                  return (
                    <motion.tr
                      key={order.id}
                      whileHover={{ backgroundColor: "rgba(0, 0, 0, 0.02)" }}
                      className="group transition-colors"
                    >
                      {/* Product Column */}
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl shadow-2xs border border-border/50",
                              food.bg,
                            )}
                          >
                            <span>{food.icon}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">
                              {food.label}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              Order #{order.orderNumber}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Table Column */}
                      <td className="py-4 pr-4 font-semibold text-foreground">
                        <span className="rounded-lg bg-secondary/80 px-2.5 py-1 text-xs font-bold text-foreground">
                          {tableLabel}
                        </span>
                      </td>

                      {/* Price Column */}
                      <td className="py-4 pr-4 font-extrabold tabular-nums text-foreground">
                        {formatCurrency(order.totalAmount)}
                      </td>

                      {/* Items Code Column */}
                      <td className="py-4 pr-4 font-mono text-xs font-bold text-muted-foreground">
                        #{order.orderNumber.slice(-4) || "4820"}
                      </td>

                      {/* Priority / Status Column */}
                      <td className="py-4 pr-4">
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white shadow-xs">
                            <CheckCircle2 className="h-3 w-3" />
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-200 dark:bg-amber-900/60 px-3 py-1 text-xs font-bold text-amber-950 dark:text-amber-200 shadow-xs">
                            <Clock className="h-3 w-3" />
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Action Column */}
                      <td className="py-4 text-right">
                        <button
                          type="button"
                          onClick={() => onViewOrder(order.id)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-background text-muted-foreground shadow-2xs transition-colors hover:border-primary hover:text-foreground hover:bg-secondary"
                          title="View order details"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </motion.div>
  );
}

