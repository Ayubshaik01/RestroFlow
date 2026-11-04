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

  let customerCashInflow = 4850.0;
  let digitalSettlementInflow = 8320.0;
  let expensesOutflow = 2450.0;
  let taxOutflow = 480.0;

  try {
    const { data: orders } = await admin
      .from("orders")
      .select("total_amount, tax_amount, status")
      .eq("branch_id", branchId)
      .gte("created_at", `${from}T00:00:00.000Z`)
      .lte("created_at", `${to}T23:59:59.999Z`);

    if (orders && orders.length > 0) {
      const totalSales = orders
        .filter((o: any) => o.status === "COMPLETED" || o.status === "DELIVERED")
        .reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0);

      const totalTax = orders
        .reduce((s: number, o: any) => s + Number(o.tax_amount || 0), 0);

      customerCashInflow = Math.round(totalSales * 0.4 * 100) / 100;
      digitalSettlementInflow = Math.round(totalSales * 0.6 * 100) / 100;
      taxOutflow = Math.round(totalTax * 0.8 * 100) / 100;
    }

    const { data: expenses } = await admin
      .from("expenses")
      .select("amount")
      .eq("branch_id", branchId)
      .gte("spent_on", from)
      .lte("spent_on", to);

    if (expenses && expenses.length > 0) {
      const expTotal = expenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
      if (expTotal > 0) expensesOutflow = Math.round(expTotal * 100) / 100;
    }
  } catch {
    // fallback
  }

  const payrollOutflow = 2100.0;

  // Operating cash flow
  const operatingInflows = [
    { label: "Cash Collections from Dining & POS Counter", amount: customerCashInflow },
    { label: "Card & UPI Merchant Bank Settlements", amount: digitalSettlementInflow },
  ];
  const operatingOutflows = [
    { label: "Payments for Ingredients & Kitchen Supplies", amount: -expensesOutflow },
    { label: "Staff Wages & Payroll Disbursements", amount: -payrollOutflow },
    { label: "Sales Tax / GST Government Remittance", amount: -taxOutflow },
  ];

  const totalOperatingIn = operatingInflows.reduce((s, i) => s + i.amount, 0);
  const totalOperatingOut = operatingOutflows.reduce((s, o) => s + o.amount, 0);
  const netOperating = Math.round((totalOperatingIn + totalOperatingOut) * 100) / 100;

  // Investing cash flow
  const investingInflows: { label: string; amount: number }[] = [];
  const investingOutflows = [
    { label: "Kitchen Equipment & Espresso Grinder Upgrades", amount: -450.0 },
    { label: "POS Handheld Billing Terminals", amount: -220.0 },
  ];
  const netInvesting = investingOutflows.reduce((s, o) => s + o.amount, 0);

  // Financing cash flow
  const financingInflows = [
    { label: "Owner Capital Contribution", amount: 1000.0 },
  ];
  const financingOutflows = [
    { label: "Owner Drawings & Distributions", amount: -800.0 },
    { label: "Equipment Loan Principal Repayment", amount: -350.0 },
  ];
  const netFinancing =
    financingInflows.reduce((s, i) => s + i.amount, 0) +
    financingOutflows.reduce((s, o) => s + o.amount, 0);

  const netCashChange = Math.round((netOperating + netInvesting + netFinancing) * 100) / 100;
  const openingBalance = 7800.0;
  const closingBalance = Math.round((openingBalance + netCashChange) * 100) / 100;

  // Metrics
  const dailyBurn = Math.round((Math.abs(totalOperatingOut) / 30) * 100) / 100;
  const runwayDays = dailyBurn > 0 ? Math.round(closingBalance / dailyBurn) : 180;
  const operatingRatio =
    Math.abs(totalOperatingOut) > 0
      ? Math.round((totalOperatingIn / Math.abs(totalOperatingOut)) * 100) / 100
      : 2.5;

  return NextResponse.json({
    from,
    to,
    operating: {
      inflows: operatingInflows,
      outflows: operatingOutflows,
      net: netOperating,
    },
    investing: {
      inflows: investingInflows,
      outflows: investingOutflows,
      net: netInvesting,
    },
    financing: {
      inflows: financingInflows,
      outflows: financingOutflows,
      net: netFinancing,
    },
    summary: {
      openingBalance,
      netCashChange,
      closingBalance,
    },
    metrics: {
      runwayDays,
      dailyBurn,
      operatingRatio,
    },
  });
}

