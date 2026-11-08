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
  const from = searchParams.get("from") || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const to = searchParams.get("to") || new Date().toISOString().slice(0, 10);

  const admin = createAdminClient();

  let ordersCount = 0;
  let grossCollected = 0;
  let taxCollected = 0;
  let refunds = 0;

  try {
    const { data: orders } = await admin
      .from("orders")
      .select("total_amount, tax_amount, tip_amount, status")
      .eq("branch_id", branchId)
      .gte("created_at", `${from}T00:00:00.000Z`)
      .lte("created_at", `${to}T23:59:59.999Z`);

    if (orders && orders.length > 0) {
      orders.forEach((o: any) => {
        if (o.status === "COMPLETED" || o.status === "DELIVERED" || o.status === "PAID") {
          ordersCount++;
          grossCollected += Number(o.total_amount || 0) - Number(o.tip_amount || 0);
          taxCollected += Number(o.tax_amount || 0);
        } else if (o.status === "CANCELLED" || o.status === "REFUNDED") {
          refunds += Number(o.total_amount || 0);
        }
      });
    }
  } catch (err) {
    console.error("Profit loss orders error:", err);
  }

  grossCollected = Math.round(grossCollected * 100) / 100;
  taxCollected = Math.round(taxCollected * 100) / 100;
  refunds = Math.round(refunds * 100) / 100;
  const netSales = Math.max(0, Math.round((grossCollected - taxCollected - refunds) * 100) / 100);

  // Expenses breakdown from real database
  const expenseMap = new Map<string, number>();
  try {
    const { data: exp } = await admin
      .from("expenses")
      .select("category, amount")
      .eq("branch_id", branchId)
      .gte("spent_on", from)
      .lte("spent_on", to);

    (exp || []).forEach((e: any) => {
      const cat = (e.category || "GENERAL").toUpperCase();
      expenseMap.set(cat, (expenseMap.get(cat) || 0) + Number(e.amount || 0));
    });
  } catch (err) {
    console.error("Profit loss expenses error:", err);
  }

  const expenses = Array.from(expenseMap.entries()).map(([category, amount]) => ({
    category,
    amount: Math.round(amount * 100) / 100,
  }));

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const payrollCost = 0; // staff payroll entered dynamically
  const netProfit = Math.round((netSales - totalExpenses - payrollCost) * 100) / 100;

  return NextResponse.json({
    orders: ordersCount,
    grossCollected,
    taxCollected,
    refunds,
    netSales,
    expenses,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    payrollCost,
    netProfit,
  });
}
