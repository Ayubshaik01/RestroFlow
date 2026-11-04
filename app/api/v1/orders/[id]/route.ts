import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSessionUser } from "@/lib/auth/server-session";
import { updateOrderSchema } from "@/types/orders";

function formatOrderDetail(order: any) {
  const tableData: any = Array.isArray(order.tables) ? order.tables[0] : order.tables;
  const customerData: any = Array.isArray(order.customers) ? order.customers[0] : order.customers;

  return {
    id: order.id,
    orderNumber: order.order_number,
    type: order.type,
    status: order.status,
    channel: order.type === "DINE_IN" ? "STAFF" : "ONLINE",
    acceptance: order.acceptance || "NOT_REQUIRED",
    tableId: order.table_id || null,
    guestName: order.guest_name || null,
    guestCount: order.guest_count || null,
    notes: order.notes || null,
    cancelReason: order.cancel_reason || null,
    cancelSource: order.cancel_source || null,
    discountType: order.discount_type || null,
    discountValue: order.discount_value ? String(order.discount_value) : null,
    subtotal: String(order.subtotal || "0.00"),
    discountAmount: String(order.discount_amount || "0.00"),
    discountPercent: String(order.discount_percent || 0),
    taxAmount: String(order.tax_amount || "0.00"),
    tipAmount: String(order.tip_amount || "0.00"),
    deliveryFee: String(order.delivery_fee || "0.00"),
    loyaltyPointsRedeemed: order.loyalty_points_redeemed || 0,
    loyaltyDiscountAmount: String(order.loyalty_discount_amount || "0.00"),
    totalAmount: String(order.total_amount || "0.00"),
    createdAt: order.created_at,
    billedAt: order.billed_at || null,
    table: tableData
      ? {
          id: tableData.id,
          number: String(tableData.number),
          name: tableData.name || null,
        }
      : null,
    customer: customerData
      ? {
          id: customerData.id,
          name: customerData.name || null,
          phone: customerData.phone || null,
        }
      : null,
    items: (order.order_items || []).map((i: any) => {
      const dbMenuItem = Array.isArray(i.menu_items) ? i.menu_items[0] : i.menu_items;
      const realName =
        i.name_snapshot && i.name_snapshot !== "Item" && i.name_snapshot.trim().length > 0
          ? i.name_snapshot
          : dbMenuItem?.name || i.name_snapshot || "Item";

      return {
        id: i.id,
        menuItemId: i.menu_item_id || "",
        nameSnapshot: realName,
        quantity: i.quantity,
        unitPriceSnapshot: String(i.unit_price_snapshot || "0.00"),
        lineTotal: String(i.line_total || "0.00"),
        taxRateSnapshot: String(i.tax_rate_snapshot || "0.00"),
        kitchenNote: i.notes || null,
        modifiers: (i.order_item_modifiers || []).map((m: any) => ({
          id: m.id,
          name: m.name_snapshot,
          nameSnapshot: m.name_snapshot,
          priceAdjustment: String(m.price_adj_snapshot || "0.00"),
        })),
        status: i.status || "PENDING",
      };
    }),
    kots: (order.kots || []).map((k: any) => ({
      id: k.id,
      kotNumber: k.kot_number,
      roundNumber: k.round_number,
      status: k.status,
      printedCount: k.printed_count || 1,
      rejectReason: k.reject_reason || null,
      createdAt: k.created_at,
      items: [],
    })),
    payments: (order.payments || []).map((p: any) => ({
      id: p.id,
      method: p.method,
      amount: String(p.amount || "0.00"),
      tendered: p.tendered ? String(p.tendered) : null,
      changeGiven: p.change_given ? String(p.change_given) : null,
      reference: p.reference || null,
      createdAt: p.created_at,
    })),
  };
}

async function fetchFullOrder(admin: any, id: string) {
  const { data: order, error } = await admin
    .from("orders")
    .select(
      `
      id,
      branch_id,
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
      coupon_code,
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
      order_items (id, menu_item_id, name_snapshot, quantity, unit_price_snapshot, line_total, tax_rate_snapshot, notes, status, menu_items:menu_item_id (id, name), order_item_modifiers (id, name_snapshot, price_adj_snapshot)),
      kots (id, kot_number, round_number, status, printed_count, reject_reason, created_at),
      payments (id, method, amount, tendered, change_given, reference, created_at)
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !order) return null;
  return order;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const admin = createAdminClient();
  const order = await fetchFullOrder(admin, id);

  if (!order) {
    return NextResponse.json({ message: "Order not found" }, { status: 404 });
  }

  return NextResponse.json(formatOrderDetail(order));
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parseResult = updateOrderSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json({ message: parseResult.error.message }, { status: 400 });
  }

  const admin = createAdminClient();
  const existing = await fetchFullOrder(admin, id);
  if (!existing) {
    return NextResponse.json({ message: "Order not found" }, { status: 404 });
  }

  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (body.guestName !== undefined) updates.guest_name = body.guestName;
  if (body.guestCount !== undefined) updates.guest_count = body.guestCount;
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.customerId !== undefined) updates.customer_id = body.customerId;

  // Handle table switch if tableId changed
  if (body.tableId !== undefined && body.tableId !== existing.table_id) {
    updates.table_id = body.tableId;

    // Release old table if there are no other open orders on it
    if (existing.table_id) {
      const { count } = await admin
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("table_id", existing.table_id)
        .eq("status", "OPEN")
        .neq("id", id);

      if (!count || count === 0) {
        await admin
          .from("tables")
          .update({ status: "AVAILABLE", status_since: new Date().toISOString() })
          .eq("id", existing.table_id);
      }
    }

    // Mark new table as OCCUPIED
    if (body.tableId) {
      await admin
        .from("tables")
        .update({ status: "OCCUPIED", status_since: new Date().toISOString() })
        .eq("id", body.tableId);
    }
  }

  const { error: updateError } = await admin
    .from("orders")
    .update(updates)
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ message: updateError.message }, { status: 500 });
  }

  const updatedOrder = await fetchFullOrder(admin, id);
  return NextResponse.json(formatOrderDetail(updatedOrder));
}
