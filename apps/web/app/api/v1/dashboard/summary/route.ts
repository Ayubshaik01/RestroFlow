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

  // 1. Fetch today's orders
  const { data: todayOrders } = await admin
    .from("orders")
    .select("id, order_number, type, status, total_amount, created_at")
    .eq("branch_id", branchId)
    .gte("created_at", todayStart.toISOString());

  const paidOrders = (todayOrders || []).filter((o) => o.status === "PAID");
  const todayRevenue = paidOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);
  const totalTodayOrders = (todayOrders || []).length;

  const onlineCount = (todayOrders || []).filter((o) => o.type !== "DINE_IN").length;
  const offlineCount = (todayOrders || []).filter((o) => o.type === "DINE_IN").length;

  // 2. Fetch tables status count
  const { data: tables } = await admin
    .from("tables")
    .select("id, status, floors!inner(branch_id)")
    .eq("floors.branch_id", branchId);

  const tableCounts = {
    available: 0,
    occupied: 0,
    reserved: 0,
    cleaning: 0,
    outOfService: 0,
  };

  (tables || []).forEach((t: any) => {
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
  const recentOrders = (todayOrders || [])
    .slice(0, 5)
    .map((o) => ({
      id: o.id,
      orderNumber: o.order_number,
      type: o.type,
      totalAmount: String(o.total_amount),
      billedAt: o.created_at,
    }));

  return NextResponse.json({
    todayRevenue,
    todayOrders: totalTodayOrders,
    channels: { online: onlineCount, offline: offlineCount },
    tables: tableCounts,
    kitchenQueue,
    recentOrders,
  });
}

