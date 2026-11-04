import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getServerSessionUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const reason = body.reason || "Cancelled by staff";
    const source = body.source || "STAFF";

    const admin = createAdminClient();

    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("id, order_number, table_id, subtotal, tax_amount, discount_amount, tip_amount, total_amount")
      .eq("id", id)
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    // Cancel order
    const { error: cancelErr } = await admin
      .from("orders")
      .update({
        status: "CANCELLED",
        cancel_source: source,
        cancel_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (cancelErr) {
      return NextResponse.json({ message: cancelErr.message }, { status: 500 });
    }

    // Cancel any open KOTs
    await admin
      .from("kots")
      .update({
        status: "CANCELLED",
        updated_at: new Date().toISOString(),
      })
      .eq("order_id", id)
      .neq("status", "SERVED");

    // Release table if no other open orders
    if (order.table_id) {
      const { count } = await admin
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("table_id", order.table_id)
        .eq("status", "OPEN")
        .neq("id", id);

      if (!count || count === 0) {
        await admin
          .from("tables")
          .update({
            status: "AVAILABLE",
            status_since: new Date().toISOString(),
          })
          .eq("id", order.table_id);
      }
    }

    return NextResponse.json({
      id: order.id,
      orderNumber: order.order_number,
      subtotal: String(order.subtotal || "0.00"),
      taxAmount: String(order.tax_amount || "0.00"),
      discountAmount: String(order.discount_amount || "0.00"),
      tipAmount: String(order.tip_amount || "0.00"),
      loyaltyPointsRedeemed: 0,
      loyaltyDiscountAmount: "0.00",
      totalAmount: String(order.total_amount || "0.00"),
      status: "CANCELLED",
    });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Failed to cancel order" }, { status: 500 });
  }
}

