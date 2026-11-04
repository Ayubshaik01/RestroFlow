import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildReceiptHtml } from "@/lib/orders/receipt-html";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select(
      `
      id,
      order_number,
      type,
      status,
      created_at,
      subtotal,
      discount_amount,
      discount_percent,
      tax_amount,
      tip_amount,
      loyalty_points_redeemed,
      loyalty_discount_amount,
      total_amount,
      branches:branch_id (
        id,
        name,
        address,
        phone,
        gst_number,
        tax_regime,
        tax_mode,
        tax_label,
        tax_id,
        restaurants:restaurant_id (name, currency)
      ),
      tables:table_id (number, name),
      customers:customer_id (name, phone),
      order_items (name_snapshot, quantity, unit_price_snapshot, line_total, tax_rate_snapshot),
      payments (method, amount, tendered, change_given)
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (!order) {
    return new NextResponse("Order not found", { status: 404 });
  }

  const branchData: any = Array.isArray(order.branches) ? order.branches[0] : order.branches;
  const restaurantData: any = branchData?.restaurants;
  const tableData: any = Array.isArray(order.tables) ? order.tables[0] : order.tables;
  const customerData: any = Array.isArray(order.customers) ? order.customers[0] : order.customers;

  const html = buildReceiptHtml({
    restaurantName: restaurantData?.name || "RestroFlow Bistro",
    currency: restaurantData?.currency || "INR",
    branch: {
      name: branchData?.name || "Main Branch",
      address: branchData?.address || "",
      phone: branchData?.phone || "",
      gstNumber: branchData?.gst_number || "",
      taxRegime: branchData?.tax_regime || "INDIA_GST",
      taxMode: branchData?.tax_mode || "INCLUSIVE",
      taxLabel: branchData?.tax_label || "GST",
      taxId: branchData?.tax_id || branchData?.gst_number || "",
    },
    order: {
      orderNumber: order.order_number,
      type: order.type,
      createdAt: order.created_at,
      table: tableData ? { label: tableData.name || `Table ${tableData.number}` } : null,
      customer: customerData ? { name: customerData.name, phone: customerData.phone } : null,
      subtotal: Number(order.subtotal),
      discountAmount: Number(order.discount_amount),
      taxAmount: Number(order.tax_amount),
      tipAmount: Number(order.tip_amount),
      loyaltyPointsRedeemed: order.loyalty_points_redeemed || 0,
      loyaltyDiscountAmount: Number(order.loyalty_discount_amount),
      totalAmount: Number(order.total_amount),
      discountPercent: Number(order.discount_percent || 0),
      isProvisional: order.status !== "PAID",
      items: (order.order_items || []).map((i: any) => ({
        nameSnapshot: i.name_snapshot,
        quantity: i.quantity,
        unitPriceSnapshot: Number(i.unit_price_snapshot),
        lineTotal: Number(i.line_total),
        taxRateSnapshot: Number(i.tax_rate_snapshot),
        modifiers: [],
      })),
      payments: (order.payments || []).map((p: any) => ({
        method: p.method,
        amount: Number(p.amount),
        tendered: p.tendered ? Number(p.tendered) : null,
        changeGiven: p.change_given ? Number(p.change_given) : null,
      })),
    },
  });

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

