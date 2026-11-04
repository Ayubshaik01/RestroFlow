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

  const { data: tickets, error } = await admin
    .from("kots")
    .select(
      `
      id,
      ticket_number,
      status,
      is_priority,
      ready_at,
      created_at,
      kitchen_stations:kitchen_station_id (name),
      orders:order_id (
        order_number,
        type,
        tables:table_id (id, number, name)
      )
    `
    )
    .eq("branch_id", branchId)
    .in("status", ["PENDING", "PREPARING", "READY"])
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json([]);
  }

  const formatted = (tickets || []).map((t: any) => ({
    id: t.id,
    ticketNumber: t.ticket_number,
    status: t.status,
    isPriority: t.is_priority ?? false,
    stationName: t.kitchen_stations?.name || null,
    createdAt: t.created_at,
    readyAt: t.ready_at || null,
    order: {
      orderNumber: t.orders?.order_number || "0001",
      type: t.orders?.type || "DINE_IN",
      table: t.orders?.tables
        ? {
            id: t.orders.tables.id,
            number: t.orders.tables.number,
            name: t.orders.tables.name,
          }
        : null,
    },
  }));

  return NextResponse.json(formatted);
}

