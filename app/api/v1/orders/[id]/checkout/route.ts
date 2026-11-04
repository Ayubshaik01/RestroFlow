import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSessionUser } from "@/lib/auth/server-session";
import { computeBill, settlePayments, round2 } from "@/lib/orders/settlement";

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
        order_items (id, menu_item_id, quantity, line_total, tax_rate_snapshot),
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

    // 2. Compute bill
    const lines = (order.order_items || []).map((i: any) => {
      const lineTotal = Number(i.line_total);
      const taxRate = Number(i.tax_rate_snapshot || 0);
      const taxAmount = taxRate > 0 ? round2(lineTotal - lineTotal / (1 + taxRate / 100)) : 0;
      return { lineTotal, taxAmount };
    });

    const bill = computeBill({
      lines,
      discountPercent: Number(body.discountPercent || 0),
      discountFlat: 0,
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
        amountPaid: totalPaidAcrossAll,
        balanceDue: Math.max(round2(bill.totalDue - totalPaidAcrossAll), 0),
        changeDue: settlement.changeDue,
        fullyPaid,
      },
    });
  } catch (error: any) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { message: error.message || "Checkout failed" },
      { status: 500 },
    );
  }
}

