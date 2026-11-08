import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/server-session";
import { createAdminClient } from "@/lib/supabase/admin";

export interface PaymentBreakdown {
  method: "CASH" | "UPI" | "BANK_CARD" | "OTHERS";
  label: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface CashFlowPeriodData {
  period: "day" | "month" | "year" | "custom";
  periodLabel: string;
  from: string;
  to: string;
  totalInflow: number;
  totalOutflow: number;
  netCashFlow: number;
  receiptsCount: number;
  distribution: {
    cash: PaymentBreakdown;
    upi: PaymentBreakdown;
    bank: PaymentBreakdown;
    others: PaymentBreakdown;
  };
  expenses: {
    total: number;
    cashExpenses: number;
    bankExpenses: number;
    count: number;
  };
  receipts: Array<{
    id: string;
    orderNumber: string;
    paidAt: string;
    method: "CASH" | "UPI" | "BANK_CARD" | "OTHERS";
    rawMethod: string;
    amount: number;
    status: string;
    orderType: string;
  }>;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function classifyMethod(raw?: string | null): "CASH" | "UPI" | "BANK_CARD" | "OTHERS" {
  if (!raw) return "CASH";
  const m = raw.toUpperCase().trim();
  if (m === "CASH") return "CASH";
  if (m === "UPI" || m.includes("GPAY") || m.includes("PHONEPE") || m.includes("PAYTM") || m.includes("QR")) return "UPI";
  if (
    m === "CARD" ||
    m.includes("BANK") ||
    m.includes("CREDIT") ||
    m.includes("DEBIT") ||
    m.includes("NETBANKING") ||
    m.includes("POS")
  ) {
    return "BANK_CARD";
  }
  return "OTHERS";
}

function buildPeriodData(
  period: "day" | "month" | "year" | "custom",
  periodLabel: string,
  from: string,
  to: string,
  allPayments: any[],
  allOrders: any[],
  allExpenses: any[],
): CashFlowPeriodData {
  const fromIso = `${from}T00:00:00.000Z`;
  const toIso = `${to}T23:59:59.999Z`;

  // 1. Filter payments in range
  const periodPayments = allPayments.filter((p) => {
    const d = p.created_at || p.orders?.created_at;
    return d && d >= fromIso && d <= toIso;
  });

  // Track covered order IDs
  const coveredOrderIds = new Set(periodPayments.map((p) => p.order_id).filter(Boolean));

  // 2. Filter orders completed in range that might not have a payments table row
  const orphanOrders = allOrders.filter((o) => {
    const d = o.created_at;
    return d && d >= fromIso && d <= toIso && !coveredOrderIds.has(o.id);
  });

  // Buckets
  let cashAmt = 0;
  let cashCount = 0;
  let upiAmt = 0;
  let upiCount = 0;
  let bankAmt = 0;
  let bankCount = 0;
  let othersAmt = 0;
  let othersCount = 0;

  const receiptsList: CashFlowPeriodData["receipts"] = [];

  // Process payments
  periodPayments.forEach((p) => {
    const amt = round2(Number(p.amount || 0));
    if (amt <= 0) return;

    const cat = classifyMethod(p.method);
    if (cat === "CASH") {
      cashAmt += amt;
      cashCount++;
    } else if (cat === "UPI") {
      upiAmt += amt;
      upiCount++;
    } else if (cat === "BANK_CARD") {
      bankAmt += amt;
      bankCount++;
    } else {
      othersAmt += amt;
      othersCount++;
    }

    receiptsList.push({
      id: p.id || `pmt-${receiptsList.length}`,
      orderNumber: p.orders?.order_number || p.reference || "RECEIPT",
      paidAt: p.created_at || fromIso,
      method: cat,
      rawMethod: p.method || "CASH",
      amount: amt,
      status: p.orders?.status || "PAID",
      orderType: p.orders?.type || "DINE_IN",
    });
  });

  // Process orphan completed orders
  orphanOrders.forEach((o) => {
    const amt = round2(Number(o.total_amount || 0));
    if (amt <= 0) return;

    // Default to Cash if unclassified
    cashAmt += amt;
    cashCount++;

    receiptsList.push({
      id: o.id,
      orderNumber: o.order_number || "ORDER",
      paidAt: o.created_at,
      method: "CASH",
      rawMethod: "CASH",
      amount: amt,
      status: o.status,
      orderType: o.type || "DINE_IN",
    });
  });

  // Sort receipts newest first
  receiptsList.sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());

  cashAmt = round2(cashAmt);
  upiAmt = round2(upiAmt);
  bankAmt = round2(bankAmt);
  othersAmt = round2(othersAmt);

  const totalInflow = round2(cashAmt + upiAmt + bankAmt + othersAmt);
  const receiptsCount = cashCount + upiCount + bankCount + othersCount;

  const pct = (val: number) => (totalInflow > 0 ? round2((val / totalInflow) * 100) : 0);

  // Filter expenses
  const periodExpenses = allExpenses.filter((e) => {
    const d = e.spent_on;
    return d && d >= from && d <= to;
  });

  let cashExpenses = 0;
  let bankExpenses = 0;

  periodExpenses.forEach((e) => {
    const amt = round2(Number(e.amount || 0));
    if (e.paid_from_cash) {
      cashExpenses += amt;
    } else {
      bankExpenses += amt;
    }
  });

  cashExpenses = round2(cashExpenses);
  bankExpenses = round2(bankExpenses);
  const totalOutflow = round2(cashExpenses + bankExpenses);
  const netCashFlow = round2(totalInflow - totalOutflow);

  return {
    period,
    periodLabel,
    from,
    to,
    totalInflow,
    totalOutflow,
    netCashFlow,
    receiptsCount,
    distribution: {
      cash: {
        method: "CASH",
        label: "Cash in Drawer",
        amount: cashAmt,
        count: cashCount,
        percentage: pct(cashAmt),
      },
      upi: {
        method: "UPI",
        label: "UPI (GPay / PhonePe / QR)",
        amount: upiAmt,
        count: upiCount,
        percentage: pct(upiAmt),
      },
      bank: {
        method: "BANK_CARD",
        label: "Bank & Cards (Card / POS / Transfer)",
        amount: bankAmt,
        count: bankCount,
        percentage: pct(bankAmt),
      },
      others: {
        method: "OTHERS",
        label: "Others (Gift Card / Aggregators / Online)",
        amount: othersAmt,
        count: othersCount,
        percentage: pct(othersAmt),
      },
    },
    expenses: {
      total: totalOutflow,
      cashExpenses,
      bankExpenses,
      count: periodExpenses.length,
    },
    receipts: receiptsList,
  };
}

export async function GET(req: Request) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId") || "demo-branch";
  const customFrom = searchParams.get("from");
  const customTo = searchParams.get("to");

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  // Month bounds
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const monthStart = `${year}-${month}-01`;
  const lastDayOfMonth = new Date(year, now.getMonth() + 1, 0).getDate();
  const monthEnd = `${year}-${month}-${String(lastDayOfMonth).padStart(2, "0")}`;

  // Year bounds
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const admin = createAdminClient();

  let allPayments: any[] = [];
  let allOrders: any[] = [];
  let allExpenses: any[] = [];

  try {
    // 1. Query all settled payments with order details
    const { data: payments } = await admin
      .from("payments")
      .select(
        `
        id,
        order_id,
        method,
        amount,
        tendered,
        change_given,
        reference,
        created_at,
        orders!inner (
          id,
          branch_id,
          order_number,
          status,
          type,
          created_at
        )
      `,
      )
      .eq("orders.branch_id", branchId);

    if (payments) allPayments = payments;

    // 2. Query orders marked completed/paid/delivered
    const { data: orders } = await admin
      .from("orders")
      .select("id, order_number, total_amount, status, type, created_at")
      .eq("branch_id", branchId)
      .in("status", ["PAID", "COMPLETED", "DELIVERED"]);

    if (orders) allOrders = orders;

    // 3. Query logged expenses
    const { data: expenses } = await admin
      .from("expenses")
      .select("id, spent_on, category, amount, note, paid_from_cash")
      .eq("branch_id", branchId);

    if (expenses) allExpenses = expenses;
  } catch (err) {
    console.error("Cash flow query error:", err);
  }

  // Build Day, Month, Year, and Custom views
  const day = buildPeriodData("day", "Today", todayStr, todayStr, allPayments, allOrders, allExpenses);
  const monthData = buildPeriodData(
    "month",
    now.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    monthStart,
    monthEnd,
    allPayments,
    allOrders,
    allExpenses,
  );
  const yearData = buildPeriodData("year", `Year ${year}`, yearStart, yearEnd, allPayments, allOrders, allExpenses);

  const custom =
    customFrom && customTo
      ? buildPeriodData("custom", `${customFrom} to ${customTo}`, customFrom, customTo, allPayments, allOrders, allExpenses)
      : null;

  // Backwards compatibility for existing financial statement UI components
  const activeView = custom || monthData;
  const operatingInflows = [
    { label: "Cash Inflow from Dining & POS Counter", amount: activeView.distribution.cash.amount },
    { label: "UPI & Direct Digital Settlements", amount: activeView.distribution.upi.amount },
    { label: "Bank Card & Terminal Settlements", amount: activeView.distribution.bank.amount },
    ...(activeView.distribution.others.amount > 0
      ? [{ label: "Other Receipts (Online / Vouchers)", amount: activeView.distribution.others.amount }]
      : []),
  ];

  const operatingOutflows = [
    { label: "Direct Cash Expenses & Supplier Payouts", amount: -activeView.expenses.cashExpenses },
    { label: "Bank / Online Operating Disbursements", amount: -activeView.expenses.bankExpenses },
  ];

  const totalOpIn = operatingInflows.reduce((s, i) => s + i.amount, 0);
  const totalOpOut = operatingOutflows.reduce((s, o) => s + o.amount, 0);
  const netOperating = round2(totalOpIn + totalOpOut);

  return NextResponse.json({
    day,
    month: monthData,
    year: yearData,
    custom,
    summary: {
      todayRevenue: day.totalInflow,
      todayCashInHand: day.distribution.cash.amount - day.expenses.cashExpenses,
      monthRevenue: monthData.totalInflow,
      yearRevenue: yearData.totalInflow,
      totalReceiptsCount: monthData.receiptsCount,
    },
    // Backwards compatibility mappings:
    summaryLegacy: {
      openingBalance: 0,
      netCashChange: activeView.netCashFlow,
      closingBalance: activeView.netCashFlow,
    },
    operating: {
      net: netOperating,
      inflows: operatingInflows,
      outflows: operatingOutflows,
    },
    metrics: {
      dailyBurn: round2(activeView.expenses.total / (lastDayOfMonth || 30)),
      runwayDays: activeView.totalInflow > 0 ? 90 : 0,
      operatingRatio: activeView.expenses.total > 0 ? round2(activeView.totalInflow / activeView.expenses.total) : 1,
    },
  });
}
