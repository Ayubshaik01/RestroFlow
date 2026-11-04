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
  const tab = searchParams.get("tab") || "active";
  const channel = searchParams.get("channel");
  const type = searchParams.get("type");

  const admin = createAdminClient();

  let query = admin
    .from("orders")
    .select(
      `
      id,
      order_number,
      type,
      status,
      acceptance,
      guest_name,
      total_amount,
      created_at,
      tables:table_id (id, name, number),
      customers:customer_id (id, name, phone),
      order_items (id, name_snapshot, quantity)
    `,
    )
    .eq("branch_id", branchId)
    .order("created_at", { ascending: false });

  if (tab === "pending") {
    query = query.eq("acceptance", "PENDING");
  } else if (tab === "active") {
    query = query.eq("status", "OPEN").neq("acceptance", "PENDING");
  } else if (tab === "history") {
    query = query.in("status", ["PAID", "CANCELLED"]);
  }

  if (type) {
    query = query.eq("type", type);
  }

  const { data: orders, error } = await query;

  if (error || !orders) {
    return NextResponse.json([]);
  }

  const formatted = orders.map((o: any) => ({
    id: o.id,
    orderNumber: o.order_number,
    type: o.type,
    status: o.status,
    channel: o.type === "DINE_IN" ? "DINE_IN" : "ONLINE",
    acceptance: o.acceptance,
    guestName: o.guest_name,
    totalAmount: String(o.total_amount),
    createdAt: o.created_at,
    table: o.tables ? { id: o.tables.id, name: o.tables.name, number: Number(o.tables.number) } : null,
    customer: o.customers ? { id: o.customers.id, name: o.customers.name, phone: o.customers.phone } : null,
    items: (o.order_items || []).map((i: any) => ({
      id: i.id,
      nameSnapshot: i.name_snapshot,
      quantity: i.quantity,
    })),
  }));

  return NextResponse.json(formatted);
}

