import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSessionUser } from "@/lib/auth/server-session";
import { priceLine, round2, toEffectiveInclusiveUnitPrice } from "@/lib/orders/pricing";

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

    // 2 & 3. Parallel fetch of branch tax config, menu items, and modifier options
    const lineInputs = body.items || [];
    if (!Array.isArray(lineInputs) || lineInputs.length === 0) {
      return NextResponse.json({ message: "No items provided" }, { status: 400 });
    }

    const itemIds = lineInputs.map((i: any) => i.menuItemId || i.id).filter(Boolean);
    const allModIds = lineInputs.flatMap((i: any) => i.modifierIds || []).filter(Boolean);

    const [branchRes, menuItemsRes, modOptionsRes] = await Promise.all([
      admin
        .from("branches")
        .select("tax_mode")
        .eq("id", order.branch_id)
        .maybeSingle(),
      itemIds.length > 0
        ? admin
            .from("menu_items")
            .select("id, name, price, tax_rate_percent, half_price")
            .in("id", itemIds)
        : Promise.resolve({ data: [] }),
      allModIds.length > 0
        ? admin
            .from("modifier_options")
            .select("id, name, price_adjustment")
            .in("id", allModIds)
        : Promise.resolve({ data: [] }),
    ]);

    const taxMode = branchRes?.data?.tax_mode || "INCLUSIVE";
    const menuMap = new Map(((menuItemsRes?.data as any[]) || []).map((m: any) => [m.id, m]));
    const modMap = new Map(((modOptionsRes?.data as any[]) || []).map((m: any) => [m.id, m]));

    const pricedItems = lineInputs.map((input: any) => {
      const menuItemId = input.menuItemId || input.id;
      const dbItem = menuMap.get(menuItemId);
      const isHalf = input.portion === "HALF";

      const modifierTotal = (input.modifierIds || []).reduce((sum: number, modId: string) => {
        const mod = modMap.get(modId);
        return sum + (mod ? Number(mod.price_adjustment || 0) : 0);
      }, 0);

      let basePrice: number;
      if (input.customPrice != null) {
        basePrice = Number(input.customPrice);
      } else if (isHalf && dbItem?.half_price != null) {
        basePrice = Number(dbItem.half_price);
      } else if (dbItem?.price != null) {
        basePrice = Number(dbItem.price);
      } else {
        basePrice = Number(input.unitPriceSnapshot ?? input.price ?? input.unitPrice ?? 0);
      }

      const rawPrice = dbItem ? basePrice + modifierTotal : Number(input.unitPriceSnapshot ?? input.price ?? input.unitPrice ?? basePrice);
      const taxRate = Number(dbItem?.tax_rate_percent ?? input.taxRatePercent ?? 5);
      const unitPrice = toEffectiveInclusiveUnitPrice(rawPrice, taxRate, taxMode);

      const quantity = Math.max(1, Number(input.quantity || 1));
      const priced = priceLine({
        quantity,
        unitPriceInclusive: unitPrice,
        taxRatePercent: taxRate,
      });

      const nameSnapshot =
        input.customLabel ||
        input.nameSnapshot ||
        input.name ||
        (dbItem ? (isHalf ? `${dbItem.name} (Half)` : dbItem.name) : "Item");

      return {
        order_id: order.id,
        menu_item_id: menuItemId,
        name_snapshot: nameSnapshot,
        quantity,
        unit_price_snapshot: unitPrice,
        line_total: priced.lineTotal,
        tax_rate_snapshot: taxRate,
        is_half_portion: isHalf,
        notes: input.kitchenNote || input.notes || null,
        modifierIds: input.modifierIds || [],
        status: "PENDING",
      };
    });

    // 4. Insert items
    const itemsToInsert = pricedItems.map(({ modifierIds: _mods, ...item }: any) => item);
    const { data: insertedItems, error: insertErr } = await admin
      .from("order_items")
      .insert(itemsToInsert)
      .select("id, name_snapshot, quantity");

    if (insertErr || !insertedItems) {
      return NextResponse.json({ message: insertErr?.message || "Failed to insert items" }, { status: 500 });
    }

    // 4b. Insert modifier options
    if (insertedItems && insertedItems.length > 0) {
      const modifierRows: any[] = [];
      insertedItems.forEach((inserted: any, idx: number) => {
        const original = pricedItems[idx];
        if (original && Array.isArray(original.modifierIds) && original.modifierIds.length > 0) {
          for (const modId of original.modifierIds) {
            const mod = modMap.get(modId);
            if (mod) {
              modifierRows.push({
                order_item_id: inserted.id,
                modifier_option_id: mod.id,
                name_snapshot: mod.name,
                price_adj_snapshot: Number(mod.price_adjustment || 0),
              });
            }
          }
        }
      });

      if (modifierRows.length > 0) {
        await admin.from("order_item_modifiers").insert(modifierRows);
      }
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
    const newTotal = round2(Math.max(0, newSubtotal - discountAmount + tipAmount));
    const finalSubtotal = round2(newSubtotal);
    const finalTax = round2(newTax);

    await admin
      .from("orders")
      .update({
        subtotal: finalSubtotal,
        tax_amount: finalTax,
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
      subtotal: String(finalSubtotal.toFixed(2)),
      taxAmount: String(finalTax.toFixed(2)),
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
