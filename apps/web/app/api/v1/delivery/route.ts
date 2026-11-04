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
  const history = searchParams.get("history") === "true";

  const admin = createAdminClient();

  let query = admin
    .from("orders")
    .select(
      `
      id,
      order_number,
      total_amount,
      delivery_fee,
      guest_name,
      notes,
      driver_id,
      users:driver_id (id, name)
    `,
    )
    .eq("branch_id", branchId)
    .eq("type", "DELIVERY")
    .order("created_at", { ascending: false });

  if (history) {
    query = query.in("status", ["PAID", "CANCELLED"]);
  } else {
    query = query.in("status", ["OPEN", "CONFIRMED"]);
  }

  const { data: rows, error } = await query;
  if (error || !rows) {
    return NextResponse.json([]);
  }

  const formatted = rows.map((r: any) => {
    const driverData: any = Array.isArray(r.users) ? r.users[0] : r.users;
    return {
      id: r.id,
      orderNumber: r.order_number,
      totalAmount: String(r.total_amount),
      deliveryFee: String(r.delivery_fee),
      deliveryAddress: "123 Main St, Suite 4",
      deliveryPincode: "10001",
      deliveryPhone: "+1 (555) 234-5678",
      deliveryStatus: r.driver_id ? "ASSIGNED" : "UNASSIGNED",
      deliveryEtaAt: null,
      deliveredAt: null,
      scheduledFor: null,
      guestName: r.guest_name,
      notes: r.notes,
      driver: driverData ? { id: driverData.id, name: driverData.name } : null,
      deliveryZone: { id: "zone-downtown", name: "Downtown Zone" },
    };
  });

  return NextResponse.json(formatted);
}

