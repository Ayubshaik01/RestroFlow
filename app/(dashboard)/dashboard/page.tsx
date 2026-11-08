"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
  ChefHat,
  Flame,
  Globe,
  ReceiptText,
  Store,
  Layers,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { BranchNotice } from "@/components/layout/branch-notice";
import { OrderDetailDialog } from "@/components/orders/order-detail-dialog";
import { Card } from "@/components/ui/card";
import { useBranch } from "@/hooks/use-branch";
import { useManagedOrders } from "@/hooks/use-orders";
import { useDashboardSummary } from "@/hooks/use-dashboard";
import { openEntity } from "@/lib/entity-events";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

// Redesigned dashboard components
import { DashboardSubnav } from "@/components/dashboard/dashboard-subnav";
import { TodayHeroStats } from "@/components/dashboard/today-hero-stats";
import { BusinessDataSection } from "@/components/dashboard/business-data-grid";
import { PopularDishesChart } from "@/components/dashboard/popular-dishes-chart";
import { RecentActivitiesTable } from "@/components/dashboard/recent-activities-table";
import { QuickActions } from "@/components/dashboard/quick-actions";

export default function DashboardPage() {
  const { branchId, branches } = useBranch();
  const activeBranch = branches.find((b) => b.id === branchId);
  const branchName = activeBranch?.name || "RestroFlow Central";
  const { data, isLoading, refetch } = useDashboardSummary(branchId);
  const [viewingOrderId, setViewingOrderId] = useState<string | null>(null);

  // Derived metrics with fallback safety
  const todayRevenue = data?.todayRevenue ?? 0;
  const todayOrders = data?.todayOrders ?? 0;
  const avgOrderValue = data?.avgOrderValue ?? (todayOrders > 0 ? todayRevenue / todayOrders : 0);
  const totalCustomers = data?.totalCustomers ?? Math.max(1, Math.round(todayOrders * 1.1));

  const pendingOrders =
    data?.pendingOrders ??
    (data?.kitchenQueue?.new ?? 0);

  const inProgressOrders =
    data?.inProgressOrders ??
    ((data?.kitchenQueue?.accepted ?? 0) + (data?.kitchenQueue?.preparing ?? 0));

  const completedOrders =
    data?.completedOrders ??
    (data?.recentOrders?.length ?? 0);

  const availableTables = data?.tables?.available ?? 0;
  const totalTables =
    data?.totalTables ??
    (availableTables + (data?.tables?.occupied ?? 0) + (data?.tables?.reserved ?? 0) + (data?.tables?.cleaning ?? 0));

  const popularItems = data?.popularItems ?? [];
  const recentOrders = data?.recentOrders ?? [];

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-black text-lg shadow-sm">
              RF
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-foreground tracking-tight text-base">
                  {branchName}
                </span>
                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  Open
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Store ID: #{branchId?.slice(0, 8) || "main"}</p>
            </div>
          </div>
        </div>

        {/* Navigation pill tabs matching reference image */}
        <DashboardSubnav />
      </div>

      {/* Order Detail Modal for inspecting orders */}
      <OrderDetailDialog
        branchId={branchId}
        orderId={viewingOrderId}
        open={!!viewingOrderId}
        onOpenChange={(open) => !open && setViewingOrderId(null)}
      />

      <BranchNotice />

      {/* Online Orders Alert Banner */}
      <PendingOrdersBanner branchId={branchId} />

      {/* Quick Actions Shortcuts */}
      <QuickActions />

      {/* 1. Today's Data Hero Stats (Pending, In Progress, Available Tables, Order Management) */}
      <TodayHeroStats
        pendingOrders={pendingOrders}
        inProgressOrders={inProgressOrders}
        availableTables={availableTables}
        totalTables={totalTables}
        completedOrders={completedOrders}
        totalOrders={todayOrders}
        isLoading={isLoading}
        onRefresh={() => refetch()}
      />

      {/* 2. Middle Row: Popular Dishes Chart (Left) + Business Data 2x2 Grid (Right) */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Most Popular Dishes Chart */}
        <div className="xl:col-span-7">
          <PopularDishesChart data={popularItems} isLoading={isLoading} />
        </div>

        {/* Business Data 4 colored cards */}
        <div className="xl:col-span-5">
          <BusinessDataSection
            todayRevenue={todayRevenue}
            todayOrders={todayOrders}
            avgOrderValue={avgOrderValue}
            totalCustomers={totalCustomers}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* 3. Bottom Row: Recent Activities Table matching reference */}
      <RecentActivitiesTable
        orders={recentOrders}
        branchName={branchName}
        isLoading={isLoading}
        onViewOrder={(orderId) => setViewingOrderId(orderId)}
      />

      {/* 4. Floor & Channel Diagnostics (Collapsible secondary analytics) */}
      {data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Floor Breakdown */}
          <Card className="flex flex-col gap-2 rounded-3xl p-5 border-border/80">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Floor Density
              </span>
              <span className="text-xs font-semibold text-foreground">
                {data.tables.occupied} Occupied
              </span>
            </div>
            <div className="flex items-center justify-between py-1 text-xs">
              <span className="text-muted-foreground">Available</span>
              <span className="font-bold text-emerald-600">{data.tables.available}</span>
            </div>
            <div className="flex items-center justify-between py-1 text-xs">
              <span className="text-muted-foreground">Reserved</span>
              <span className="font-bold text-amber-600">{data.tables.reserved}</span>
            </div>
            <div className="flex items-center justify-between py-1 text-xs">
              <span className="text-muted-foreground">Cleaning / Reset</span>
              <span className="font-bold text-muted-foreground">{data.tables.cleaning}</span>
            </div>
          </Card>

          {/* Kitchen Queue Breakdown */}
          <Card className="flex flex-col gap-2 rounded-3xl p-5 border-border/80">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <div className="flex items-center gap-1.5">
                <ChefHat className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Kitchen Line
                </span>
              </div>
              <span className="text-xs font-semibold text-primary">
                {data.kitchenQueue.preparing} Firing
              </span>
            </div>
            <div className="flex items-center justify-between py-1 text-xs">
              <span className="text-muted-foreground">New Tickets</span>
              <span className="font-bold text-foreground">{data.kitchenQueue.new}</span>
            </div>
            <div className="flex items-center justify-between py-1 text-xs">
              <span className="text-muted-foreground">Accepted</span>
              <span className="font-bold text-amber-600">{data.kitchenQueue.accepted}</span>
            </div>
            <div className="flex items-center justify-between py-1 text-xs">
              <span className="text-muted-foreground">Ready for Service</span>
              <span className="font-bold text-emerald-600">{data.kitchenQueue.ready}</span>
            </div>
          </Card>

          {/* Channel Mix */}
          <Card className="flex flex-col justify-between rounded-3xl p-5 border-border/80">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Order Channels
              </span>
              <span className="text-xs font-semibold text-foreground">
                {data.channels.online + data.channels.offline} Total
              </span>
            </div>
            <div className="flex flex-col gap-2 my-auto">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Globe className="h-3.5 w-3.5 text-primary" />
                  Online / QR
                </span>
                <span className="font-bold tabular-nums text-foreground">
                  {data.channels.online}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Store className="h-3.5 w-3.5 text-muted-foreground" />
                  Counter / Dine-in
                </span>
                <span className="font-bold tabular-nums text-foreground">
                  {data.channels.offline}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-primary transition-all duration-500 rounded-full"
                  style={{
                    width: `${
                      data.channels.online + data.channels.offline === 0
                        ? 0
                        : (data.channels.online / (data.channels.online + data.channels.offline)) * 100
                    }%`,
                  }}
                />
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// Online orders waiting for kitchen action
function PendingOrdersBanner({ branchId }: { branchId: string | null }) {
  const { data } = useManagedOrders(branchId, "pending");
  if (!data || data.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="flex flex-col gap-3 rounded-2xl border-primary/40 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Flame className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">
              {data.length} incoming online order{data.length === 1 ? "" : "s"} waiting for acceptance
            </p>
            <p className="text-xs text-muted-foreground">
              Accept to route tickets to kitchen display (KDS).
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => openEntity("Order", data[0].id)}
            className="rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90 transition-all"
          >
            Review #{data[0].orderNumber}
          </button>
          <Link
            href="/orders"
            className="flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-secondary transition-all"
          >
            <span>All orders</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </Card>
    </motion.div>
  );
}
