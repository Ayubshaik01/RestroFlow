import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSessionUser } from "@/lib/auth/server-session";
import { computeBill, round2 } from "@/lib/orders/settlement";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const admin = createAdminClient();

  // Fetch order and items
  const { data: order, error } = await admin
    .from("orders")
    .select(
      `
      id,
      status,
      subtotal,
      total_amount,
      tip_amount,
      delivery_fee,
      discount_amount,
      discount_percent,
      order_items (line_total, tax_rate_snapshot),
      payments (amount)
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !order) {
    return NextResponse.json({ message: "Order not found" }, { status: 404 });
  }

  const lines = (order.order_items || []).map((i: any) => {
    const lineTotal = Number(i.line_total);
    const taxRate = Number(i.tax_rate_snapshot || 0);
    const taxAmount = taxRate > 0 ? round2(lineTotal - lineTotal / (1 + taxRate / 100)) : 0;
    return { lineTotal, taxAmount };
  });

  const bill = computeBill({
    lines,
    discountPercent: Number(body.discountPercent || order.discount_percent || 0),
    discountFlat: 0,
    tip: Number(body.tipAmount ?? order.tip_amount ?? 0),
    deliveryFee: Number(order.delivery_fee || 0),
    loyaltyDiscountRequested: Number(body.loyaltyPointsToRedeem || 0),
  });

  const amountPaid = (order.payments || []).reduce(
    (sum: number, p: any) => sum + Number(p.amount),
    0,
  );
  const balanceDue = Math.max(round2(bill.totalDue - amountPaid), 0);

  return NextResponse.json({
    locked: order.status === "PAID",
    status: order.status,
    subtotal: bill.subtotal,
    discountAmount: bill.discountAmount,
    discountPercent: bill.discountPercent,
    discountType: bill.discountAmount > 0 ? "PERCENT" : null,
    discountValue: bill.discountPercent,
    couponCode: body.couponCode || null,
    promotionName: null,
    taxAmount: bill.taxAmount,
    loyaltyPointsRedeemed: Number(body.loyaltyPointsToRedeem || 0),
    loyaltyDiscountAmount: bill.loyaltyDiscountAmount,
    tipAmount: bill.tipAmount,
    deliveryFee: bill.deliveryFee,
    totalDue: bill.totalDue,
    amountPaid: round2(amountPaid),
    balanceDue: round2(balanceDue),
  });
}

