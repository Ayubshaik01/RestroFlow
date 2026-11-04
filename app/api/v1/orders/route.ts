import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSessionUser } from "@/lib/auth/server-session";
import { priceLine, round2, toEffectiveInclusiveUnitPrice } from "@/lib/orders/pricing";

export async function GET(req: Request) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId") || "demo-branch";
  const tableId = searchParams.get("tableId");

  const admin = createAdminClient();

  let query = admin
    .from("orders")
    .select(
      `
      id,
      order_number,
      type,
      status,
      acceptance,
      subtotal,
      total_amount,
      tax_amount,
      discount_amount,
      tip_amount,
      delivery_fee,
      table_id,
      customer_id,
      created_at,
      tables:table_id (id, number, name),
      customers:customer_id (id, name, phone),
      order_items (id, name_snapshot, quantity, unit_price_snapshot, line_total, status)
    `,
    )
    .eq("branch_id", branchId)
    .order("created_at", { ascending: false });

  if (tableId) {
    query = query.eq("table_id", tableId).eq("status", "OPEN");
  } else {
    query = query.eq("status", "OPEN");
  }

  const { data: orders, error } = await query;

  if (error || !orders) {
    return NextResponse.json([]);
  }

  const formatted = orders.map((o: any) => ({
    id: o.id,
    orderNumber: o.order_number,
    type: o.type,
    status: o.status,
    acceptance: o.acceptance,
    subtotal: String(o.subtotal),
    taxAmount: String(o.tax_amount),
    discountAmount: String(o.discount_amount),
    tipAmount: String(o.tip_amount),
    deliveryFee: String(o.delivery_fee),
    totalAmount: String(o.total_amount),
    tableId: o.table_id,
    createdAt: o.created_at,
    table: o.tables ? { id: o.tables.id, number: o.tables.number, name: o.tables.name } : null,
    customer: o.customers ? { id: o.customers.id, name: o.customers.name, phone: o.customers.phone } : null,
    items: (o.order_items || []).map((i: any) => ({
      id: i.id,
      nameSnapshot: i.name_snapshot,
      quantity: i.quantity,
      unitPriceSnapshot: String(i.unit_price_snapshot),
      lineTotal: String(i.line_total),
    })),
  }));

  return NextResponse.json(formatted);
}

export async function POST(req: Request) {
  try {
    const user = await getServerSessionUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId") || "demo-branch";
    const body = await req.json();

    const admin = createAdminClient();

    // 1. Fetch branch tax configuration
    const { data: branch } = await admin
      .from("branches")
      .select("tax_regime, tax_mode")
      .eq("id", branchId)
      .maybeSingle();

    const taxMode = branch?.tax_mode || "INCLUSIVE";

    // 2. Generate Order Number
    const orderNumber = `${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 90)}`;

    // 3. Price the order lines
    const lineInputs = body.items || [];
    if (!Array.isArray(lineInputs) || lineInputs.length === 0) {
      return NextResponse.json({ message: "No items provided" }, { status: 400 });
    }

    // Collect all menuItemIds and modifierIds to fetch from DB
    const itemIds = lineInputs.map((i: any) => i.menuItemId || i.id).filter(Boolean);
    const allModIds = lineInputs.flatMap((i: any) => i.modifierIds || []).filter(Boolean);

    // Fetch menu items from DB
    const { data: menuItems } = itemIds.length > 0
      ? await admin
          .from("menu_items")
          .select("id, name, price, tax_rate_percent, half_price")
          .in("id", itemIds)
      : { data: [] };
    const menuMap = new Map((menuItems || []).map((m: any) => [m.id, m]));

    // Fetch modifier options from DB
    const { data: modifierOptions } = allModIds.length > 0
      ? await admin
          .from("modifier_options")
          .select("id, name, price_adjustment")
          .in("id", allModIds)
      : { data: [] };
    const modMap = new Map((modifierOptions || []).map((m: any) => [m.id, m]));

    let subtotal = 0;
    let taxAmount = 0;

    const pricedItems = lineInputs.map((item: any) => {
      const menuItemId = item.menuItemId || item.id;
      const dbItem = menuMap.get(menuItemId);
      const isHalf = item.portion === "HALF";

      // Calculate modifier total from DB options
      const modifierTotal = (item.modifierIds || []).reduce((sum: number, modId: string) => {
        const mod = modMap.get(modId);
        return sum + (mod ? Number(mod.price_adjustment || 0) : 0);
      }, 0);

      // Determine raw base price
      let basePrice: number;
      if (item.customPrice != null) {
        basePrice = Number(item.customPrice);
      } else if (isHalf && dbItem?.half_price != null) {
        basePrice = Number(dbItem.half_price);
      } else if (dbItem?.price != null) {
        basePrice = Number(dbItem.price);
      } else {
        basePrice = Number(item.unitPriceSnapshot ?? item.price ?? item.unitPrice ?? 0);
      }

      // If client supplied an already-calculated unitPrice and dbItem wasn't found, use it;
      // otherwise calculate authoritative price from base + modifierTotal.
      const rawPrice = dbItem ? basePrice + modifierTotal : Number(item.unitPriceSnapshot ?? item.price ?? item.unitPrice ?? basePrice);
      const taxRate = Number(dbItem?.tax_rate_percent ?? item.taxRatePercent ?? 5);
      const unitPrice = toEffectiveInclusiveUnitPrice(rawPrice, taxRate, taxMode);

      const quantity = Math.max(1, Number(item.quantity || 1));
      const priced = priceLine({
        quantity,
        unitPriceInclusive: unitPrice,
        taxRatePercent: taxRate,
      });

      subtotal += priced.lineTotal;
      taxAmount += priced.taxAmount;

      const nameSnapshot =
        item.customLabel ||
        item.nameSnapshot ||
        item.name ||
        (dbItem ? (isHalf ? `${dbItem.name} (Half)` : dbItem.name) : "Item");

      return {
        menu_item_id: menuItemId,
        name_snapshot: nameSnapshot,
        quantity,
        unit_price_snapshot: unitPrice,
        line_total: priced.lineTotal,
        tax_rate_snapshot: taxRate,
        is_half_portion: isHalf,
        notes: item.kitchenNote || item.notes || null,
        modifierIds: item.modifierIds || [],
        status: "PENDING",
      };
    });

    const totalAmount = round2(subtotal);
    const finalSubtotal = round2(subtotal);
    const finalTax = round2(taxAmount);

    // 4. Create Order
    const { data: newOrder, error: orderError } = await admin
      .from("orders")
      .insert({
        branch_id: branchId,
        table_id: body.tableId || null,
        customer_id: body.customerId || null,
        order_number: orderNumber,
        type: body.type || "DINE_IN",
        status: "OPEN",
        acceptance: body.type === "DINE_IN" ? "NOT_REQUIRED" : "PENDING",
        subtotal: finalSubtotal,
        tax_amount: finalTax,
        total_amount: totalAmount,
        guest_name: body.guestName || null,
        created_by_id: user.id,
      })
      .select()
      .single();

    if (orderError || !newOrder) {
      throw new Error(orderError?.message || "Failed to create order");
    }

    // 5. Insert Order Items
    const itemsToInsert = pricedItems.map(({ modifierIds: _mods, ...item }: any) => ({
      ...item,
      order_id: newOrder.id,
    }));

    const { data: insertedItems } = await admin
      .from("order_items")
      .insert(itemsToInsert)
      .select("id, menu_item_id, name_snapshot, quantity");

    // 5b. Insert Order Item Modifiers
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

    // 6. Create Kitchen Ticket (KOT)
    const { data: kot } = await admin
      .from("kots")
      .insert({
        order_id: newOrder.id,
        kot_number: `KOT-${orderNumber}`,
        round_number: 1,
        status: "NEW",
      })
      .select("id")
      .single();

    if (kot && insertedItems) {
      const kotItems = insertedItems.map((item: any) => ({
        kot_id: kot.id,
        order_item_id: item.id,
        quantity: item.quantity,
      }));
      await admin.from("kot_items").insert(kotItems);
    }

    // 7. Mark Table as OCCUPIED if Dine-In
    if (body.tableId) {
      await admin
        .from("tables")
        .update({
          status: "OCCUPIED",
          status_since: new Date().toISOString(),
        })
        .eq("id", body.tableId);
    }

    return NextResponse.json({
      id: newOrder.id,
      orderNumber: newOrder.order_number,
      subtotal: String(newOrder.subtotal),
      taxAmount: String(newOrder.tax_amount),
      discountAmount: String(newOrder.discount_amount),
      tipAmount: String(newOrder.tip_amount),
      loyaltyPointsRedeemed: 0,
      loyaltyDiscountAmount: "0.00",
      totalAmount: String(newOrder.total_amount),
      status: newOrder.status,
    });
  } catch (error: any) {
    console.error("Create order error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to create order" },
      { status: 500 },
    );
  }
}
