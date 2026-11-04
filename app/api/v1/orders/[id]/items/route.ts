import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSessionUser } from "@/lib/auth/server-session";
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

    const { id: orderId } = await params;
    const body = await req.json();
    const admin = createAdminClient();

    // 1. Fetch current order
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("id, branch_id, order_number, status, subtotal, tax_amount, total_amount, discount_amount, tip_amount, loyalty_points_redeemed, loyalty_discount_amount")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    if (order.status !== "OPEN") {
      return NextResponse.json({ message: "Cannot add items to a closed order" }, { status: 400 });
    }

    // 2. Fetch branch tax config
    const { data: branch } = await admin
      .from("branches")
      .select("tax_mode")
      .eq("id", order.branch_id)
      .maybeSingle();

    const taxMode = branch?.tax_mode || "INCLUSIVE";
    const lineInputs = body.items || [];
    if (!Array.isArray(lineInputs) || lineInputs.length === 0) {
      return NextResponse.json({ message: "No items provided" }, { status: 400 });
    }

    // 3. Fetch menu items to price correctly
    const itemIds = lineInputs.map((i: any) => i.menuItemId || i.id).filter(Boolean);
    const { data: menuItems } = await admin
      .from("menu_items")
      .select("id, name, price, tax_rate_percent, half_price")
      .in("id", itemIds);

    const menuMap = new Map((menuItems || []).map((m: any) => [m.id, m]));

    const newOrderItems: any[] = [];
    for (const input of lineInputs) {
      const menuItemId = input.menuItemId || input.id;
      const dbItem = menuMap.get(menuItemId);
      const isHalf = input.portion === "HALF";
      const rawPrice = input.customPrice ?? (isHalf && dbItem?.half_price ? Number(dbItem.half_price) : Number(dbItem?.price ?? input.unitPriceSnapshot ?? 0));
      const taxRate = Number(dbItem?.tax_rate_percent ?? input.taxRatePercent ?? 5);
      const unitPrice = toEffectiveInclusiveUnitPrice(rawPrice, taxRate, taxMode);

      const priced = priceLine({
        quantity: input.quantity || 1,
        unitPriceInclusive: unitPrice,
        taxRatePercent: taxRate,
      });

      newOrderItems.push({
        order_id: order.id,
        menu_item_id: menuItemId,
        name_snapshot: input.customLabel || dbItem?.name || input.nameSnapshot || "Item",
        quantity: input.quantity || 1,
        unit_price_snapshot: unitPrice,
        line_total: priced.lineTotal,
        tax_rate_snapshot: taxRate,
        is_half_portion: isHalf,
        notes: input.kitchenNote || input.notes || null,
        status: "PENDING",
      });
    }

    // 4. Insert items
    const { data: insertedItems, error: insertErr } = await admin
      .from("order_items")
      .insert(newOrderItems)
      .select("id, name_snapshot, quantity");

    if (insertErr || !insertedItems) {
      return NextResponse.json({ message: insertErr?.message || "Failed to insert items" }, { status: 500 });
    }

    // 5. Recalculate totals for the whole order
    const { data: allItems } = await admin
      .from("order_items")
      .select("line_total, tax_rate_snapshot, quantity, unit_price_snapshot")
      .eq("order_id", order.id);

    let newSubtotal = 0;
    let newTax = 0;
    for (const item of allItems || []) {
      const lineTotal = Number(item.line_total || 0);
      const taxRate = Number(item.tax_rate_snapshot || 5);
      const priced = priceLine({
        quantity: item.quantity,
        unitPriceInclusive: Number(item.unit_price_snapshot),
        taxRatePercent: taxRate,
      });
      newSubtotal += lineTotal;
      newTax += priced.taxAmount;
    }

    const discountAmount = Number(order.discount_amount || 0);
    const tipAmount = Number(order.tip_amount || 0);
    const newTotal = Math.max(0, newSubtotal - discountAmount + tipAmount);

    await admin
      .from("orders")
      .update({
        subtotal: newSubtotal,
        tax_amount: newTax,
        total_amount: newTotal,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    // 6. Create next-round KOT
    const { data: existingKots } = await admin
      .from("kots")
      .select("round_number")
      .eq("order_id", order.id)
      .order("round_number", { ascending: false })
      .limit(1);

    const nextRound = (existingKots?.[0]?.round_number || 1) + 1;
    const kotNumber = `KOT-${order.order_number}-R${nextRound}`;

    const { data: kot } = await admin
      .from("kots")
      .insert({
        order_id: order.id,
        kot_number: kotNumber,
        round_number: nextRound,
        status: "NEW",
        priority: "NORMAL",
      })
      .select("id")
      .single();

    if (kot) {
      const kotItems = insertedItems.map((item: any) => ({
        kot_id: kot.id,
        order_item_id: item.id,
        quantity: item.quantity,
      }));
      await admin.from("kot_items").insert(kotItems);
    }

    return NextResponse.json({
      id: order.id,
      orderNumber: order.order_number,
      subtotal: String(newSubtotal.toFixed(2)),
      taxAmount: String(newTax.toFixed(2)),
      discountAmount: String(order.discount_amount || "0.00"),
      tipAmount: String(order.tip_amount || "0.00"),
      loyaltyPointsRedeemed: order.loyalty_points_redeemed || 0,
      loyaltyDiscountAmount: String(order.loyalty_discount_amount || "0.00"),
      totalAmount: String(newTotal.toFixed(2)),
      status: order.status,
    });
  } catch (err: any) {
    console.error("Add order items error:", err);
    return NextResponse.json({ message: err.message || "Failed to add items" }, { status: 500 });
  }
}

