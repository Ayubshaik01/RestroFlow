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
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const admin = createAdminClient();

  let query = admin
    .from("expenses")
    .select("id, spent_on, category, amount, note, paid_from_cash")
    .eq("branch_id", branchId)
    .order("spent_on", { ascending: false });

  if (from) query = query.gte("spent_on", from);
  if (to) query = query.lte("spent_on", to);

  const { data: rows, error } = await query;
  if (error || !rows) {
    return NextResponse.json([]);
  }

  const formatted = rows.map((r: any) => ({
    id: r.id,
    spentOn: r.spent_on,
    category: r.category,
    amount: String(r.amount),
    note: r.note,
    paidFromCash: Boolean(r.paid_from_cash),
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

  const { data: inserted, error } = await admin
    .from("expenses")
    .insert({
      branch_id: branchId,
      spent_on: body.spentOn || new Date().toISOString().slice(0, 10),
      category: body.category || "GENERAL",
      amount: Number(body.amount),
      note: body.note || null,
      paid_from_cash: Boolean(body.paidFromCash),
      created_by_id: user.id,
    })
    .select()
    .single();

  if (error || !inserted) {
    return NextResponse.json({ message: error?.message || "Failed to create expense" }, { status: 500 });
  }

  return NextResponse.json({
    id: inserted.id,
    spentOn: inserted.spent_on,
    category: inserted.category,
    amount: String(inserted.amount),
    note: inserted.note,
    paidFromCash: Boolean(inserted.paid_from_cash),
  });
}

