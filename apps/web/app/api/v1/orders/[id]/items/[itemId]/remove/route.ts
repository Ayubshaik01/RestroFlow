import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSessionUser } from "@/lib/auth/server-session";
import { priceLine } from "@/lib/orders/pricing";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    const user = await getServerSessionUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id: orderId, itemId } = await params;
    const body = await req.json().catch(() => ({}));
    const reason = body.reason || "Removed by staff";

    const admin = createAdminClient();

    // 1. Delete or void order item
    await admin.from("kot_items").delete().eq("order_item_id", itemId);
    const { error: delErr } = await admin
      .from("order_items")
      .delete()
      .eq("id", itemId)
      .eq("order_id", orderId);

    if (delErr) {
      return NextResponse.json({ message: delErr.message }, { status: 500 });
    }

    // 2. Recalculate remaining items
    const { data: allItems } = await admin
      .from("order_items")
      .select("line_total, tax_rate_snapshot, quantity, unit_price_snapshot")
      .eq("order_id", orderId);

    let newSubtotal = 0;
    let newTax = 0;
    for (const line of allItems || []) {
      const p = priceLine({
        quantity: line.quantity,
        unitPriceInclusive: Number(line.unit_price_snapshot),
        taxRatePercent: Number(line.tax_rate_snapshot || 5),
      });
      newSubtotal += Number(line.line_total || 0);
      newTax += p.taxAmount;
    }

    const { data: order } = await admin
      .from("orders")
      .select("discount_amount, tip_amount")
      .eq("id", orderId)
      .single();

    const discountAmount = Number(order?.discount_amount || 0);
    const tipAmount = Number(order?.tip_amount || 0);
    const newTotal = Math.max(0, newSubtotal - discountAmount + tipAmount);

    await admin
      .from("orders")
      .update({
        subtotal: newSubtotal,
        tax_amount: newTax,
        total_amount: newTotal,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    // Return full updated order
    const { data: fullOrder } = await admin
      .from("orders")
      .select(
        `
        id,
        order_number,
        type,
        status,
        acceptance,
        cancel_source,
        cancel_reason,
        subtotal,
        discount_amount,
        discount_percent,
        discount_type,
        discount_value,
        tax_amount,
        tip_amount,
        delivery_fee,
        loyalty_points_redeemed,
        loyalty_discount_amount,
        total_amount,
        guest_name,
        guest_count,
        notes,
        table_id,
        customer_id,
        created_at,
        tables:table_id (id, number, name),
        customers:customer_id (id, name, phone),
        order_items (id, menu_item_id, name_snapshot, quantity, unit_price_snapshot, line_total, tax_rate_snapshot, notes, status),
        kots (id, kot_number, round_number, status, printed_count, reject_reason, created_at),
        payments (id, method, amount, tendered, change_given, reference, created_at)
      `,
      )
      .eq("id", orderId)
      .single();

    if (!fullOrder) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    const tableData: any = Array.isArray(fullOrder.tables) ? fullOrder.tables[0] : fullOrder.tables;
    const customerData: any = Array.isArray(fullOrder.customers) ? fullOrder.customers[0] : fullOrder.customers;

    return NextResponse.json({
      id: fullOrder.id,
      orderNumber: fullOrder.order_number,
      type: fullOrder.type,
      status: fullOrder.status,
      channel: fullOrder.type === "DINE_IN" ? "STAFF" : "ONLINE",
      acceptance: fullOrder.acceptance || "NOT_REQUIRED",
      tableId: fullOrder.table_id || null,
      guestName: fullOrder.guest_name || null,
      guestCount: fullOrder.guest_count || null,
      notes: fullOrder.notes || null,
      cancelReason: fullOrder.cancel_reason || null,
      cancelSource: fullOrder.cancel_source || null,
      discountType: fullOrder.discount_type || null,
      discountValue: fullOrder.discount_value ? String(fullOrder.discount_value) : null,
      subtotal: String(fullOrder.subtotal),
      discountAmount: String(fullOrder.discount_amount),
      discountPercent: String(fullOrder.discount_percent || 0),
      taxAmount: String(fullOrder.tax_amount),
      tipAmount: String(fullOrder.tip_amount),
      deliveryFee: String(fullOrder.delivery_fee || "0.00"),
      loyaltyPointsRedeemed: fullOrder.loyalty_points_redeemed || 0,
      loyaltyDiscountAmount: String(fullOrder.loyalty_discount_amount || "0.00"),
      totalAmount: String(fullOrder.total_amount),
      createdAt: fullOrder.created_at,
      billedAt: null,
      table: tableData ? { id: tableData.id, number: String(tableData.number), name: tableData.name } : null,
      customer: customerData ? { id: customerData.id, name: customerData.name, phone: customerData.phone } : null,
      items: (fullOrder.order_items || []).map((i: any) => ({
        id: i.id,
        menuItemId: i.menu_item_id || "",
        nameSnapshot: i.name_snapshot,
        quantity: i.quantity,
        unitPriceSnapshot: String(i.unit_price_snapshot),
        lineTotal: String(i.line_total),
        kitchenNote: i.notes || null,
        modifiers: [],
        status: i.status || "PENDING",
      })),
      kots: (fullOrder.kots || []).map((k: any) => ({
        id: k.id,
        status: k.status,
        printedCount: k.printed_count || 1,
        rejectReason: k.reject_reason || null,
        items: [],
      })),
      payments: (fullOrder.payments || []).map((p: any) => ({
        id: p.id,
        method: p.method,
        amount: String(p.amount),
        tendered: p.tendered ? String(p.tendered) : null,
        changeGiven: p.change_given ? String(p.change_given) : null,
        createdAt: p.created_at,
      })),
    });
  } catch (err: any) {
    console.error("Remove item error:", err);
    return NextResponse.json({ message: err.message || "Failed to remove item" }, { status: 500 });
  }
}
