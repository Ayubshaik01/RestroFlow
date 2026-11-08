import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/server-session";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId") || "demo-branch";
  const date = searchParams.get("date") || new Date().toISOString().slice(0, 10);
  const openingFloat = Number(searchParams.get("openingFloat") || 0);

  const admin = createAdminClient();

  let cashSales = 0;
  let cashExpenses = 0;

  try {
    const dayStart = `${date}T00:00:00.000Z`;
    const dayEnd = `${date}T23:59:59.999Z`;

    // 1. Sum payments received in cash for this branch on this date
    const { data: payments } = await admin
      .from("payments")
      .select("amount, method, created_at, orders!inner(branch_id)")
      .eq("orders.branch_id", branchId)
      .eq("method", "CASH")
      .gte("created_at", dayStart)
      .lte("created_at", dayEnd);

    if (payments && payments.length > 0) {
      cashSales = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    }

    // 2. Sum expenses paid from cash on this date
    const { data: expenses } = await admin
      .from("expenses")
      .select("amount")
      .eq("branch_id", branchId)
      .eq("spent_on", date)
      .eq("paid_from_cash", true);

    if (expenses && expenses.length > 0) {
      cashExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    }
  } catch (err) {
    console.error("Cash closing preview error:", err);
  }

  cashSales = Math.round(cashSales * 100) / 100;
  cashExpenses = Math.round(cashExpenses * 100) / 100;
  const expectedCash = Math.round((openingFloat + cashSales - cashExpenses) * 100) / 100;

  return NextResponse.json({
    businessDate: date,
    openingFloat,
    cashSales,
    cashExpenses,
    expectedCash,
  });
}
