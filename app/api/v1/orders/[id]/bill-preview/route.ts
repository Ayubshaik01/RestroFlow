import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSessionUser } from "@/lib/auth/server-session";
import { computeBill, round2 } from "@/lib/orders/settlement";
import { priceLine, toEffectiveInclusiveUnitPrice } from "@/lib/orders/pricing";

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
      branch_id,
      status,
      subtotal,
      total_amount,
      tip_amount,
      delivery_fee,
      discount_amount,
      discount_percent,
      order_items (id, menu_item_id, quantity, unit_price_snapshot, line_total, tax_rate_snapshot, is_half_portion),
      payments (amount)
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !order) {
    return NextResponse.json({ message: "Order not found" }, { status: 404 });
  }

  // Self-heal: If any order items were created with 0 line_total, fetch their prices from menu_items
  const items = order.order_items || [];
  const zeroPriceItems = items.filter((i: any) => Number(i.line_total || 0) <= 0 && i.menu_item_id);

  if (zeroPriceItems.length > 0) {
    const itemIds = zeroPriceItems.map((i: any) => i.menu_item_id);
    const { data: dbMenuItems } = await admin
      .from("menu_items")
      .select("id, price, half_price, tax_rate_percent")
      .in("id", itemIds);

    const priceMap = new Map((dbMenuItems || []).map((m: any) => [m.id, m]));

    for (const item of zeroPriceItems) {
      const db = priceMap.get(item.menu_item_id);
      if (db) {
        const raw = item.is_half_portion && db.half_price ? Number(db.half_price) : Number(db.price);
        const taxRate = Number(db.tax_rate_percent || item.tax_rate_snapshot || 5);
        const unit = toEffectiveInclusiveUnitPrice(raw, taxRate, "INCLUSIVE");
        const priced = priceLine({
          quantity: item.quantity || 1,
          unitPriceInclusive: unit,
          taxRatePercent: taxRate,
        });

        item.line_total = priced.lineTotal;
        item.unit_price_snapshot = unit;
        item.tax_rate_snapshot = taxRate;

        // Persist healed figures back to order_items
        await admin
          .from("order_items")
          .update({
            line_total: priced.lineTotal,
            unit_price_snapshot: unit,
            tax_rate_snapshot: taxRate,
          })
          .eq("id", item.id);
      }
    }
  }

  // Handle coupon validation if provided
  let couponDiscountPercent = 0;
  let couponDiscountFlat = 0;
  let appliedCouponCode: string | null = null;

  if (body.couponCode && typeof body.couponCode === "string" && body.couponCode.trim()) {
    const code = body.couponCode.trim();
    const { data: coupon } = await admin
      .from("coupons")
      .select("code, type, value, min_order_amount, max_discount, is_active")
      .eq("branch_id", order.branch_id)
      .ilike("code", code)
      .eq("is_active", true)
      .maybeSingle();

    if (coupon) {
      appliedCouponCode = coupon.code;
      if (coupon.type === "PERCENT") {
        couponDiscountPercent = Number(coupon.value);
      } else {
        couponDiscountFlat = Number(coupon.value);
      }
    }
  }

  const lines = items.map((i: any) => {
    const lineTotal = Number(i.line_total);
    const taxRate = Number(i.tax_rate_snapshot || 0);
    const taxAmount = taxRate > 0 ? round2(lineTotal - lineTotal / (1 + taxRate / 100)) : 0;
    return { lineTotal, taxAmount };
  });

  const manualDiscountPercent = Number(body.discountPercent || order.discount_percent || 0);
  const totalDiscountPercent = manualDiscountPercent + couponDiscountPercent;

  const bill = computeBill({
    lines,
    discountPercent: totalDiscountPercent,
    discountFlat: couponDiscountFlat,
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
    couponCode: appliedCouponCode || body.couponCode || null,
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
