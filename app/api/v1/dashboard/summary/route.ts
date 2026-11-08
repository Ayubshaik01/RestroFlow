import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function GET(req: Request) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId") || "demo-branch";
  const admin = createAdminClient();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // 1. Fetch today's orders (include customer_name, customer_phone for distinct customer count)
  const { data: todayOrders } = await admin
    .from("orders")
    .select("id, order_number, type, status, total_amount, created_at, customer_name, customer_phone")
    .eq("branch_id", branchId)
    .gte("created_at", todayStart.toISOString());

  const allOrders = todayOrders || [];

  const paidOrders = allOrders.filter((o) => o.status === "PAID");
  const todayRevenue = paidOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);
  const totalTodayOrders = allOrders.length;

  const onlineCount = allOrders.filter((o) => o.type !== "DINE_IN").length;
  const offlineCount = allOrders.filter((o) => o.type === "DINE_IN").length;

  // New: Average order value
  const avgOrderValue = paidOrders.length > 0 ? todayRevenue / paidOrders.length : 0;

  // New: Total distinct customers (by customer_name or customer_phone)
  const customerSet = new Set<string>();
  allOrders.forEach((o: any) => {
    const identifier = o.customer_phone || o.customer_name;
    if (identifier) customerSet.add(identifier);
  });
  const totalCustomers = customerSet.size;

  // New: Order status breakdowns
  const pendingStatuses = new Set(["NEW", "PENDING", "PLACED"]);
  const inProgressStatuses = new Set(["ACCEPTED", "PREPARING", "IN_PROGRESS"]);
  const completedStatuses = new Set(["PAID", "COMPLETED", "DELIVERED"]);

  const pendingOrders = allOrders.filter((o) => pendingStatuses.has(o.status)).length;
  const inProgressOrders = allOrders.filter((o) => inProgressStatuses.has(o.status)).length;
  const completedOrders = allOrders.filter((o) => completedStatuses.has(o.status)).length;

  // 2. Fetch tables status count
  const { data: tables } = await admin
    .from("tables")
    .select("id, status, floors!inner(branch_id)")
    .eq("floors.branch_id", branchId);

  const allTables = tables || [];
  const totalTables = allTables.length;

  const tableCounts = {
    available: 0,
    occupied: 0,
    reserved: 0,
    cleaning: 0,
    outOfService: 0,
  };

  allTables.forEach((t: any) => {
    if (t.status === "AVAILABLE") tableCounts.available++;
    else if (t.status === "OCCUPIED") tableCounts.occupied++;
    else if (t.status === "RESERVED") tableCounts.reserved++;
    else if (t.status === "CLEANING") tableCounts.cleaning++;
    else if (t.status === "OUT_OF_SERVICE") tableCounts.outOfService++;
  });

  // 3. Fetch kitchen queue counts
  const { data: kots } = await admin
    .from("kots")
    .select("status, orders!inner(branch_id)")
    .eq("orders.branch_id", branchId)
    .in("status", ["NEW", "ACCEPTED", "PREPARING", "READY"]);

  const kitchenQueue = { new: 0, accepted: 0, preparing: 0, ready: 0 };
  (kots || []).forEach((k: any) => {
    if (k.status === "NEW") kitchenQueue.new++;
    else if (k.status === "ACCEPTED") kitchenQueue.accepted++;
    else if (k.status === "PREPARING") kitchenQueue.preparing++;
    else if (k.status === "READY") kitchenQueue.ready++;
  });

  // 4. Recent orders
  const recentOrders = allOrders
    .slice(0, 5)
    .map((o) => ({
      id: o.id,
      orderNumber: o.order_number,
      type: o.type,
      totalAmount: String(o.total_amount),
      billedAt: o.created_at,
    }));

  // 5. Popular items — top 10 by quantity from kot_items joined with menu_items
  let popularItems: { name: string; quantity: number; revenue: number }[] = [];
  try {
    const { data: kotItems } = await admin
      .from("kot_items")
      .select("quantity, price, menu_items!inner(name), kots!inner(orders!inner(branch_id, created_at))")
      .eq("kots.orders.branch_id", branchId)
      .gte("kots.orders.created_at", todayStart.toISOString());

    if (kotItems && kotItems.length > 0) {
      const itemMap = new Map<string, { quantity: number; revenue: number }>();

      kotItems.forEach((item: any) => {
        const name = item.menu_items?.name || "Unknown";
        const qty = Number(item.quantity) || 0;
        const rev = qty * (Number(item.price) || 0);

        if (itemMap.has(name)) {
          const existing = itemMap.get(name)!;
          existing.quantity += qty;
          existing.revenue += rev;
        } else {
          itemMap.set(name, { quantity: qty, revenue: rev });
        }
      });

      popularItems = Array.from(itemMap.entries())
        .map(([name, data]) => ({ name, quantity: data.quantity, revenue: data.revenue }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);
    }
  } catch {
    // If the join fails, return empty array — handled gracefully on frontend
    popularItems = [];
  }

  return NextResponse.json({
    todayRevenue,
    todayOrders: totalTodayOrders,
    channels: { online: onlineCount, offline: offlineCount },
    tables: tableCounts,
    kitchenQueue,
    recentOrders,
    avgOrderValue,
    totalCustomers,
    pendingOrders,
    inProgressOrders,
    completedOrders,
    totalTables,
    popularItems,
  });
}
