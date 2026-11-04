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

  const admin = createAdminClient();

  const { data: rows, error } = await admin
    .from("cash_closings")
    .select("id, business_date, expected_cash, counted_cash, variance, note")
    .eq("branch_id", branchId)
    .order("business_date", { ascending: false });

  if (error || !rows) {
    return NextResponse.json([]);
  }

  const formatted = rows.map((r: any) => ({
    id: r.id,
    businessDate: r.business_date,
    expectedCash: String(r.expected_cash),
    countedCash: String(r.counted_cash),
    variance: String(r.variance),
    note: r.note,
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

  const expected = Number(body.expectedCash || 0);
  const counted = Number(body.countedCash || 0);
  const variance = counted - expected;

  const { data: inserted, error } = await admin
    .from("cash_closings")
    .insert({
      branch_id: branchId,
      business_date: body.businessDate || new Date().toISOString().slice(0, 10),
      opening_float: Number(body.openingFloat || 0),
      cash_sales: Number(body.cashSales || 0),
      cash_expenses: Number(body.cashExpenses || 0),
      expected_cash: expected,
      counted_cash: counted,
      variance: variance,
      note: body.note || null,
      closed_by_id: user.id,
    })
    .select()
    .single();

  if (error || !inserted) {
    return NextResponse.json({ message: error?.message || "Failed to close cash" }, { status: 500 });
  }

  return NextResponse.json({
    id: inserted.id,
    businessDate: inserted.business_date,
    expectedCash: String(inserted.expected_cash),
    countedCash: String(inserted.counted_cash),
    variance: String(inserted.variance),
    note: inserted.note,
  });
}

