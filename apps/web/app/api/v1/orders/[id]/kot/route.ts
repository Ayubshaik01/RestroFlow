import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildKotHtml } from "@/lib/orders/kot-html";

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
      created_at,
      branches:branch_id (name),
      tables:table_id (number, name),
      order_items (name_snapshot, quantity, notes)
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (!order) {
    return new NextResponse("Order not found", { status: 404 });
  }

  const branchData: any = Array.isArray(order.branches) ? order.branches[0] : order.branches;
  const tableData: any = Array.isArray(order.tables) ? order.tables[0] : order.tables;
  const html = buildKotHtml({
    branchName: branchData?.name || "Main Branch",
    order: {
      orderNumber: order.order_number,
      type: order.type,
      createdAt: order.created_at,
      table: tableData ? { label: tableData.name || `Table ${tableData.number}` } : null,
      items: (order.order_items || []).map((i: any) => ({
        nameSnapshot: i.name_snapshot,
        quantity: i.quantity,
        notes: i.notes,
      })),
    },
  });

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

