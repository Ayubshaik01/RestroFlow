import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSessionUser } from "@/lib/auth/server-session";
import { computeBill, settlePayments, round2 } from "@/lib/orders/settlement";
import { priceLine, toEffectiveInclusiveUnitPrice } from "@/lib/orders/pricing";

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
    const body = await req.json();
    const admin = createAdminClient();

    // 1. Fetch current order with lines and existing payments
    const { data: order, error: orderError } = await admin
      .from("orders")
      .select(
        `
        id,
        branch_id,
        table_id,
        customer_id,
        order_number,
        status,
        subtotal,
        delivery_fee,
        order_items (id, menu_item_id, quantity, unit_price_snapshot, line_total, tax_rate_snapshot, is_half_portion),
        payments (id, amount)
      `,
      )
      .eq("id", id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    if (order.status === "PAID") {
      return NextResponse.json({ message: "Order is already paid" }, { status: 400 });
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

    // 2. Compute bill
    const lines = items.map((i: any) => {
      const lineTotal = Number(i.line_total);
      const taxRate = Number(i.tax_rate_snapshot || 0);
      const taxAmount = taxRate > 0 ? round2(lineTotal - lineTotal / (1 + taxRate / 100)) : 0;
      return { lineTotal, taxAmount };
    });

    const manualDiscountPercent = Number(body.discountPercent || 0);
    const totalDiscountPercent = manualDiscountPercent + couponDiscountPercent;

    const bill = computeBill({
      lines,
      discountPercent: totalDiscountPercent,
      discountFlat: couponDiscountFlat,
      tip: Number(body.tipAmount || 0),
      deliveryFee: Number(order.delivery_fee || 0),
      loyaltyDiscountRequested: Number(body.loyaltyPointsToRedeem || 0),
    });

    // Existing payments
    const existingPaid = (order.payments || []).reduce(
      (sum: number, p: any) => sum + Number(p.amount),
      0,
    );
    const balanceBefore = Math.max(round2(bill.totalDue - existingPaid), 0);

    // Settle incoming payments
    const settlement = settlePayments({
      balance: balanceBefore,
      payments: body.payments || [],
      allowPartial: body.allowPartial ?? false,
    });

    // 3. Record new payments
    const paymentRows = settlement.payments.map((p) => ({
      order_id: order.id,
      method: p.method,
      amount: p.amount,
      tendered: p.tendered,
      change_given: p.changeGiven,
      reference: p.reference || null,
    }));

    if (paymentRows.length > 0) {
      await admin.from("payments").insert(paymentRows);
    }

    const totalPaidAcrossAll = round2(existingPaid + settlement.paidNow);
    const fullyPaid = totalPaidAcrossAll >= bill.totalDue;

    // 4. Update Order
    const { data: updatedOrder, error: updateError } = await admin
      .from("orders")
      .update({
        status: fullyPaid ? "PAID" : "OPEN",
        subtotal: bill.subtotal,
        discount_amount: bill.discountAmount,
        discount_percent: bill.discountPercent,
        coupon_code: appliedCouponCode,
        tax_amount: bill.taxAmount,
        tip_amount: bill.tipAmount,
        loyalty_points_redeemed: Number(body.loyaltyPointsToRedeem || 0),
        loyalty_discount_amount: bill.loyaltyDiscountAmount,
        total_amount: bill.totalDue,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)
      .select()
      .single();

    if (updateError || !updatedOrder) {
      throw new Error(updateError?.message || "Failed to update order");
    }

    // 5. Release Table if fully paid
    if (fullyPaid && order.table_id) {
      await admin
        .from("tables")
        .update({
          status: "AVAILABLE",
          status_since: new Date().toISOString(),
        })
        .eq("id", order.table_id);
    }

    return NextResponse.json({
      id: updatedOrder.id,
      orderNumber: updatedOrder.order_number,
      subtotal: String(updatedOrder.subtotal),
      taxAmount: String(updatedOrder.tax_amount),
      discountAmount: String(updatedOrder.discount_amount),
      tipAmount: String(updatedOrder.tip_amount),
      loyaltyPointsRedeemed: updatedOrder.loyalty_points_redeemed,
      loyaltyDiscountAmount: String(updatedOrder.loyalty_discount_amount),
      totalAmount: String(updatedOrder.total_amount),
      status: updatedOrder.status,
      settlement: {
        amountDue: bill.totalDue,
        amountPaid: settlement.paidNow,
        balanceDue: settlement.balanceAfter,
        changeDue: settlement.changeDue,
        fullyPaid,
      },
      payments: settlement.payments,
    });
  } catch (error: any) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { message: error.message || "Checkout failed" },
      { status: 500 },
    );
  }
}
