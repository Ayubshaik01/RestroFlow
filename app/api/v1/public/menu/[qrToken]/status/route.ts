import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ qrToken: string }> },
) {
  const { qrToken } = await params;
  const admin = createAdminClient();

  const { data: table } = await admin
    .from("tables")
    .select("id, number, name")
    .eq("qr_token", qrToken)
    .maybeSingle();

  if (!table) {
    return NextResponse.json({ message: "Table not found" }, { status: 404 });
  }

  // Find latest active order for this table
  const { data: latestOrder } = await admin
    .from("orders")
    .select(
      `
      id,
      order_number,
      status,
      acceptance,
      order_items (id, name_snapshot, quantity, status)
    `,
    )
    .eq("table_id", table.id)
    .eq("status", "OPEN")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Find open service requests
  const { data: requests } = await admin
    .from("table_requests")
    .select("type")
    .eq("table_id", table.id)
    .eq("status", "PENDING");

  const openRequests = (requests || []).map((r) => r.type);

  return NextResponse.json({
    order: latestOrder
      ? {
          orderNumber: latestOrder.order_number,
          status: latestOrder.status,
          acceptance: latestOrder.acceptance,
          items: (latestOrder.order_items || []).map((i: any) => ({
            id: i.id,
            nameSnapshot: i.name_snapshot,
            quantity: i.quantity,
            status: i.status,
          })),
        }
      : null,
    openRequests,
  });
}

