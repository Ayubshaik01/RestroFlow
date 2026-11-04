import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSessionUser } from "@/lib/auth/server-session";
import { priceLine } from "@/lib/orders/pricing";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getServerSessionUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id: targetOrderId } = await params;
    const body = await req.json();
    const sourceOrderId = body.sourceOrderId;

    if (!sourceOrderId || sourceOrderId === targetOrderId) {
      return NextResponse.json({ message: "Invalid source order" }, { status: 400 });
    }

    const admin = createAdminClient();

    // 1. Move items
    const { error: moveErr } = await admin
      .from("order_items")
      .update({ order_id: targetOrderId })
      .eq("order_id", sourceOrderId);

    if (moveErr) {
      return NextResponse.json({ message: moveErr.message }, { status: 500 });
    }

    // 2. Cancel source order
    await admin
      .from("orders")
      .update({
        status: "CANCELLED",
        cancel_reason: `Merged into order #${targetOrderId}`,
        cancel_source: "STAFF",
        updated_at: new Date().toISOString(),
      })
      .eq("id", sourceOrderId);

    // 3. Recalculate target order
    const { data: allItems } = await admin
      .from("order_items")
      .select("line_total, tax_rate_snapshot, quantity, unit_price_snapshot")
      .eq("order_id", targetOrderId);

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

    await admin
      .from("orders")
      .update({
        subtotal: newSubtotal,
        tax_amount: newTax,
        total_amount: newSubtotal,
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetOrderId);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Failed to merge orders" }, { status: 500 });
  }
}

