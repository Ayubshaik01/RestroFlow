import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { priceLine } from "@/lib/orders/pricing";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ qrToken: string }> },
) {
  try {
    const { qrToken } = await params;
    const body = await req.json();
    const admin = createAdminClient();

    // Look up table and branch
    const { data: table, error: tableError } = await admin
      .from("tables")
      .select("id, number, name, floors!inner(branch_id)")
      .eq("qr_token", qrToken)
      .maybeSingle();

  if (tableError || !table) {
    return NextResponse.json({ message: "Invalid table QR code" }, { status: 404 });
  }

  const floorData: any = table.floors;
  const branchId = floorData.branch_id;

  const orderNumber = `${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 90)}`;
  const items = body.items || [];

  if (items.length === 0) {
    return NextResponse.json({ message: "Cart cannot be empty" }, { status: 400 });
  }

  // Fetch menu items to price correctly
  const itemIds = items.map((i: any) => i.menuItemId);
  const { data: menuItems } = await admin
    .from("menu_items")
    .select("id, name, price, tax_rate_percent")
    .in("id", itemIds);

  const itemMap = new Map((menuItems || []).map((m) => [m.id, m]));

  let subtotal = 0;
  let taxAmount = 0;

  const pricedLines = items.map((cartItem: any) => {
    const menuItem = itemMap.get(cartItem.menuItemId);
    const unitPrice = Number(menuItem?.price || 0);
    const taxRate = Number(menuItem?.tax_rate_percent || 5);
    const priced = priceLine({
      quantity: cartItem.quantity,
      unitPriceInclusive: unitPrice,
      taxRatePercent: taxRate,
    });

    subtotal += priced.lineTotal;
    taxAmount += priced.taxAmount;

    return {
      menu_item_id: cartItem.menuItemId,
      name_snapshot: menuItem?.name || "Item",
      quantity: cartItem.quantity,
      unit_price_snapshot: unitPrice,
      line_total: priced.lineTotal,
      tax_rate_snapshot: taxRate,
      status: "PENDING",
    };
  });

  // Create order
  const { data: order, error: orderErr } = await admin
    .from("orders")
    .insert({
      branch_id: branchId,
      table_id: table.id,
      order_number: orderNumber,
      type: "DINE_IN",
      status: "OPEN",
      acceptance: "PENDING", // Needs staff confirmation or auto-confirm
      subtotal,
      tax_amount: taxAmount,
      total_amount: subtotal,
      guest_name: body.guestName || "Guest",
    })
    .select()
    .single();

  if (orderErr || !order) {
    throw new Error(orderErr?.message || "Failed to place order");
  }

  // Insert items
  const itemsWithId = pricedLines.map((l: any) => ({
    ...l,
    order_id: order.id,
  }));
  await admin.from("order_items").insert(itemsWithId);

  // Mark table OCCUPIED
  await admin
    .from("tables")
    .update({ status: "OCCUPIED", status_since: new Date().toISOString() })
    .eq("id", table.id);

  return NextResponse.json({ orderNumber: order.order_number });
  } catch (error: any) {
    console.error("Public order error:", error);
    return NextResponse.json({ message: error.message || "Failed to place order" }, { status: 500 });
  }
}

