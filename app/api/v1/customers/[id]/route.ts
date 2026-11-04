import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const admin = createAdminClient();

  const { data: customer } = await admin
    .from("customers")
    .select(
      `
      id,
      name,
      phone,
      email,
      address,
      notes,
      loyalty_points_balance,
      created_at,
      orders (id, order_number, total_amount, created_at)
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (!customer) {
    return NextResponse.json({ message: "Customer not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    address: customer.address,
    notes: customer.notes,
    loyaltyPoints: customer.loyalty_points_balance || 0,
    walletBalance: "0.00",
    createdAt: customer.created_at,
    orders: (customer.orders || []).map((o: any) => ({
      id: o.id,
      orderNumber: o.order_number,
      totalAmount: String(o.total_amount),
      billedAt: o.created_at,
    })),
    giftCards: [],
  });
}

