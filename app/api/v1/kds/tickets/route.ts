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
  const stationId = searchParams.get("stationId");

  const admin = createAdminClient();

  let query = admin
    .from("kots")
    .select(
      `
      id,
      order_id,
      kitchen_station_id,
      kot_number,
      status,
      priority,
      created_at,
      kitchen_stations:kitchen_station_id (id, name),
      orders!inner (
        id,
        order_number,
        type,
        guest_name,
        branch_id,
        tables:table_id (number, name),
        customers:customer_id (name, phone)
      ),
      kot_items (
        id,
        order_items (
          id,
          name_snapshot,
          quantity,
          notes
        )
      )
    `,
    )
    .eq("orders.branch_id", branchId)
    .in("status", ["NEW", "ACCEPTED", "PREPARING", "READY"])
    .order("created_at", { ascending: true });

  if (stationId) {
    query = query.eq("kitchen_station_id", stationId);
  }

  const { data: tickets, error } = await query;

  if (error || !tickets) {
    return NextResponse.json([]);
  }

  const formatted = tickets.map((t: any) => ({
    id: t.id,
    orderId: t.order_id,
    stationId: t.kitchen_station_id,
    ticketNumber: t.kot_number,
    status: t.status,
    isPriority: t.priority === "HIGH",
    printedCount: 1,
    lastPrintError: null,
    createdAt: t.created_at,
    station: t.kitchen_stations ? { id: t.kitchen_stations.id, name: t.kitchen_stations.name } : null,
    order: {
      orderNumber: t.orders.order_number,
      type: t.orders.type,
      channel: t.orders.type === "DINE_IN" ? "STAFF" : "ONLINE",
      notes: null,
      table: t.orders.tables
        ? {
            number: String(t.orders.tables.number),
            name: t.orders.tables.name,
          }
        : null,
      guestName: t.orders.guest_name,
      customer: t.orders.customers
        ? { name: t.orders.customers.name, phone: t.orders.customers.phone }
        : null,
    },
    items: (t.kot_items || []).map((ki: any) => ({
      id: ki.id,
      orderItem: {
        nameSnapshot: ki.order_items?.name_snapshot || "Item",
        quantity: ki.order_items?.quantity || 1,
        kitchenNote: ki.order_items?.notes || null,
        modifiers: [],
      },
    })),
  }));

  return NextResponse.json(formatted);
}

