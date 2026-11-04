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

  const { data: incoming } = await admin
    .from("orders")
    .select(
      `
      id,
      order_number,
      type,
      guest_name,
      created_at,
      tables:table_id (number, name),
      customers:customer_id (name, phone),
      order_items (id, name_snapshot, quantity, notes)
    `,
    )
    .eq("branch_id", branchId)
    .eq("acceptance", "PENDING")
    .order("created_at", { ascending: true });

  const formatted = (incoming || []).map((o: any) => ({
    id: o.id,
    orderNumber: o.order_number,
    type: o.type,
    channel: "ONLINE" as const,
    guestName: o.guest_name,
    notes: null,
    createdAt: o.created_at,
    scheduledFor: null,
    table: o.tables ? { number: String(o.tables.number), name: o.tables.name } : null,
    customer: o.customers ? { name: o.customers.name, phone: o.customers.phone } : null,
    items: (o.order_items || []).map((i: any) => ({
      id: i.id,
      nameSnapshot: i.name_snapshot,
      quantity: i.quantity,
      kitchenNote: i.notes,
      modifiers: [],
    })),
  }));

  return NextResponse.json(formatted);
}

