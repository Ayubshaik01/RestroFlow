import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { priceLine } from "@/lib/orders/pricing";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const body = await req.json();
    const admin = createAdminClient();

    const { data: branch } = await admin
      .from("branches")
      .select("id, tax_mode, restaurants!inner(currency)")
      .eq("kiosk_token", token)
      .maybeSingle();

    if (!branch) {
      return NextResponse.json({ message: "Kiosk not found" }, { status: 404 });
    }

    const orderNumber = `K${Date.now().toString().slice(-4)}`;
    const items = body.items || [];

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

    const restaurant: any = branch.restaurants;

    // Create Order
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .insert({
        branch_id: branch.id,
        order_number: orderNumber,
        type: body.serviceType === "DINE_IN" ? "DINE_IN" : "TAKEAWAY",
        status: "OPEN",
        acceptance: "PENDING",
        subtotal,
        tax_amount: taxAmount,
        total_amount: subtotal,
        guest_name: "Kiosk Customer",
      })
      .select()
      .single();

    if (orderErr || !order) {
      throw new Error(orderErr?.message || "Failed to create kiosk order");
    }

    const itemsWithId = pricedLines.map((l: any) => ({ ...l, order_id: order.id }));
    await admin.from("order_items").insert(itemsWithId);

    return NextResponse.json({
      orderNumber: order.order_number,
      createdAt: order.created_at,
      currency: restaurant?.currency || "INR",
      items: pricedLines.map((l: any) => ({
        name: l.name_snapshot,
        quantity: l.quantity,
        lineTotal: String(l.line_total),
      })),
      subtotal: String(subtotal),
      taxAmount: String(taxAmount),
      totalAmount: String(subtotal),
      paid: false,
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

