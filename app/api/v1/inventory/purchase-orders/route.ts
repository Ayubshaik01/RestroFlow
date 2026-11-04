import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function GET(req: Request) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId") || "demo-branch";
  const status = searchParams.get("status");

  const admin = createAdminClient();

  let query = admin
    .from("purchase_orders")
    .select(
      `
      id,
      po_number,
      status,
      expected_date,
      total_amount,
      notes,
      created_at,
      suppliers:supplier_id (id, name)
    `,
    )
    .eq("branch_id", branchId)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data: pos } = await query;

  const formatted = (pos || []).map((p: any) => ({
    id: p.id,
    poNumber: p.po_number,
    status: p.status,
    expectedDate: p.expected_date,
    totalAmount: String(p.total_amount),
    notes: p.notes,
    createdAt: p.created_at,
    supplier: p.suppliers ? { id: p.suppliers.id, name: p.suppliers.name } : null,
  }));

  return NextResponse.json(formatted);
}

export async function POST(req: Request) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId") || "demo-branch";
  const body = await req.json();

  const admin = createAdminClient();
  const poNumber = `PO-${Date.now().toString().slice(-4)}`;

  const { data: po, error } = await admin
    .from("purchase_orders")
    .insert({
      branch_id: branchId,
      supplier_id: body.supplierId,
      po_number: poNumber,
      status: "DRAFT",
      expected_date: body.expectedDate || null,
      notes: body.notes || null,
      total_amount: body.totalAmount || 0,
      created_by_id: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json(po);
}

