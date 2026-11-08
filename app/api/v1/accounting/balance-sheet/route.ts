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
  const asOf = searchParams.get("asOf") || new Date().toISOString().slice(0, 10);

  const admin = createAdminClient();

  // 1. Calculate Real Inventory Value
  let inventoryValue = 0;
  try {
    const { data: ingredients } = await admin
      .from("ingredients")
      .select("current_stock, cost_per_unit, cost_per_kg")
      .eq("branch_id", branchId);

    if (ingredients && ingredients.length > 0) {
      const computed = ingredients.reduce((sum: number, ing: any) => {
        const cost = Number(ing.cost_per_unit || ing.cost_per_kg || 0);
        return sum + Number(ing.current_stock || 0) * cost;
      }, 0);
      inventoryValue = Math.round(computed * 100) / 100;
    }
  } catch (err) {
    console.error("Balance sheet inventory error:", err);
  }

  // 2. Real Cash and Bank from Orders & Payments
  let cashInTill = 0;
  let bankBalance = 0;
  let taxPayable = 0;
  let openReceivables = 0;

  try {
    const { data: payments } = await admin
      .from("payments")
      .select("amount, method, created_at, orders!inner(branch_id)")
      .eq("orders.branch_id", branchId)
      .lte("created_at", `${asOf}T23:59:59.999Z`);

    const { data: expenses } = await admin
      .from("expenses")
      .select("amount, paid_from_cash")
      .eq("branch_id", branchId)
      .lte("spent_on", asOf);

    let totalCashIn = 0;
    let totalDigitalIn = 0;

    (payments || []).forEach((p: any) => {
      const amt = Number(p.amount || 0);
      if ((p.method || "").toUpperCase() === "CASH") {
        totalCashIn += amt;
      } else {
        totalDigitalIn += amt;
      }
    });

    let totalCashOut = 0;
    let totalDigitalOut = 0;

    (expenses || []).forEach((e: any) => {
      const amt = Number(e.amount || 0);
      if (e.paid_from_cash) {
        totalCashOut += amt;
      } else {
        totalDigitalOut += amt;
      }
    });

    cashInTill = Math.max(0, Math.round((totalCashIn - totalCashOut) * 100) / 100);
    bankBalance = Math.max(0, Math.round((totalDigitalIn - totalDigitalOut) * 100) / 100);

    const { data: orders } = await admin
      .from("orders")
      .select("total_amount, tax_amount, status")
      .eq("branch_id", branchId)
      .lte("created_at", `${asOf}T23:59:59.999Z`);

    if (orders && orders.length > 0) {
      const totalTax = orders
        .filter((o: any) => o.status === "COMPLETED" || o.status === "DELIVERED" || o.status === "PAID")
        .reduce((sum: number, o: any) => sum + Number(o.tax_amount || 0), 0);
      const unpaid = orders
        .filter((o: any) => o.status === "OPEN" || o.status === "PENDING")
        .reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0);

      taxPayable = Math.round(totalTax * 100) / 100;
      openReceivables = Math.round(unpaid * 100) / 100;
    }
  } catch (err) {
    console.error("Balance sheet balances error:", err);
  }

  // 3. Accounts Payable from unpaid expenses
  let accountsPayable = 0;
  try {
    const { data: exp } = await admin
      .from("expenses")
      .select("amount, paid_from_cash")
      .eq("branch_id", branchId)
      .eq("paid_from_cash", false);

    if (exp && exp.length > 0) {
      const unpaidExp = exp.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);
      accountsPayable = Math.round(unpaidExp * 100) / 100;
    }
  } catch {
    //
  }

  const equipmentValue = 0; // recorded when user logs capital assets

  // Assets
  const currentAssets = [
    { label: "Cash in Register & Drawer Till", amount: cashInTill },
    { label: "Operating Bank Account", amount: bankBalance },
    { label: "Inventory on Hand (Ingredients & Stock)", amount: inventoryValue },
    ...(openReceivables > 0 ? [{ label: "Accounts Receivable (Open Dining Orders)", amount: openReceivables }] : []),
  ];
  const nonCurrentAssets: { label: string; amount: number }[] = equipmentValue > 0
    ? [{ label: "Kitchen Equipment & POS Hardware", amount: equipmentValue }]
    : [];

  const totalCurrentAssets = currentAssets.reduce((s, a) => s + a.amount, 0);
  const totalNonCurrentAssets = nonCurrentAssets.reduce((s, a) => s + a.amount, 0);
  const totalAssets = Math.round((totalCurrentAssets + totalNonCurrentAssets) * 100) / 100;

  // Liabilities
  const currentLiabilities = [
    ...(accountsPayable > 0 ? [{ label: "Accounts Payable (Vendor Bills)", amount: accountsPayable }] : []),
    ...(taxPayable > 0 ? [{ label: "Sales Tax / GST Output Liability", amount: taxPayable }] : []),
  ];
  const nonCurrentLiabilities: { label: string; amount: number }[] = [];

  const totalCurrentLiabilities = currentLiabilities.reduce((s, l) => s + l.amount, 0);
  const totalNonCurrentLiabilities = nonCurrentLiabilities.reduce((s, l) => s + l.amount, 0);
  const totalLiabilities = Math.round((totalCurrentLiabilities + totalNonCurrentLiabilities) * 100) / 100;

  // Equity
  const totalEquity = Math.round((totalAssets - totalLiabilities) * 100) / 100;
  const equityItems = [
    { label: "Retained Earnings / Operating Surplus", amount: totalEquity },
  ];

  return NextResponse.json({
    asOfDate: asOf,
    assets: {
      current: currentAssets,
      nonCurrent: nonCurrentAssets,
      totalCurrent: totalCurrentAssets,
      totalNonCurrent: totalNonCurrentAssets,
      total: totalAssets,
    },
    liabilities: {
      current: currentLiabilities,
      nonCurrent: nonCurrentLiabilities,
      totalCurrent: totalCurrentLiabilities,
      totalNonCurrent: totalNonCurrentLiabilities,
      total: totalLiabilities,
    },
    equity: {
      items: equityItems,
      total: totalEquity,
    },
    totalLiabilitiesAndEquity: Math.round((totalLiabilities + totalEquity) * 100) / 100,
  });
}
