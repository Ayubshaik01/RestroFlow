import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/server-session";
import { createAdminClient } from "@/lib/supabase/admin";

interface JournalEntry {
  id: string;
  branchId: string;
  entryDate: string;
  accountName: string;
  accountType: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
  description: string;
  reference: string;
  debit: number;
  credit: number;
  balance?: number;
}

const memoryLedger: JournalEntry[] = [
  {
    id: "jl-101",
    branchId: "demo-branch",
    entryDate: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
    accountName: "1010 - Till & Drawer Cash",
    accountType: "ASSET",
    description: "Daily POS Cash Register Collections",
    reference: "POS-CLS-091",
    debit: 1250.0,
    credit: 0.0,
  },
  {
    id: "jl-102",
    branchId: "demo-branch",
    entryDate: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
    accountName: "4010 - Food & Beverage Revenue",
    accountType: "REVENUE",
    description: "Daily Dining Sales Recognition",
    reference: "POS-CLS-091",
    debit: 0.0,
    credit: 1190.5,
  },
  {
    id: "jl-103",
    branchId: "demo-branch",
    entryDate: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
    accountName: "2010 - Sales Tax / GST Payable",
    accountType: "LIABILITY",
    description: "5% GST Output on Daily Dining Sales",
    reference: "POS-CLS-091",
    debit: 0.0,
    credit: 59.5,
  },
  {
    id: "jl-104",
    branchId: "demo-branch",
    entryDate: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10),
    accountName: "5010 - Fresh Produce & Ingredients COGS",
    accountType: "EXPENSE",
    description: "Vegetables & Dairy Inward Delivery",
    reference: "VEND-8821",
    debit: 480.0,
    credit: 0.0,
  },
  {
    id: "jl-105",
    branchId: "demo-branch",
    entryDate: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10),
    accountName: "2020 - Accounts Payable (Suppliers)",
    accountType: "LIABILITY",
    description: "Vendor Invoice Payable Net 15",
    reference: "VEND-8821",
    debit: 0.0,
    credit: 480.0,
  },
  {
    id: "jl-106",
    branchId: "demo-branch",
    entryDate: new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10),
    accountName: "6010 - Restaurant Premises Rent",
    accountType: "EXPENSE",
    description: "Monthly Property Lease Amortization",
    reference: "LEASE-NOV",
    debit: 2500.0,
    credit: 0.0,
  },
  {
    id: "jl-107",
    branchId: "demo-branch",
    entryDate: new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10),
    accountName: "1020 - Operating Bank Account",
    accountType: "ASSET",
    description: "Direct Bank Transfer for Store Lease",
    reference: "LEASE-NOV",
    debit: 0.0,
    credit: 2500.0,
  },
];

export async function GET(req: Request) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId") || "demo-branch";
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const accountType = searchParams.get("accountType");
  const search = searchParams.get("search")?.toLowerCase();

  const admin = createAdminClient();

  // Dynamically load real expenses and orders as ledger lines
  const dynamicEntries: JournalEntry[] = [...memoryLedger];

  try {
    const { data: expenses } = await admin
      .from("expenses")
      .select("id, spent_on, category, amount, note, paid_from_cash")
      .eq("branch_id", branchId)
      .limit(30);

    (expenses || []).forEach((e: any) => {
      const amt = Number(e.amount || 0);
      dynamicEntries.push({
        id: `exp-${e.id}`,
        branchId,
        entryDate: (e.spent_on || "").slice(0, 10),
        accountName: `6020 - ${e.category || "General"} Expense`,
        accountType: "EXPENSE",
        description: e.note || `Expense for ${e.category}`,
        reference: `EXP-${e.id.slice(0, 6)}`,
        debit: amt,
        credit: 0.0,
      });

      dynamicEntries.push({
        id: `exp-offset-${e.id}`,
        branchId,
        entryDate: (e.spent_on || "").slice(0, 10),
        accountName: e.paid_from_cash ? "1010 - Till & Drawer Cash" : "1020 - Operating Bank Account",
        accountType: "ASSET",
        description: `Disbursement for ${e.category}`,
        reference: `EXP-${e.id.slice(0, 6)}`,
        debit: 0.0,
        credit: amt,
      });
    });
  } catch {
    // ignore
  }

  let filtered = dynamicEntries.filter((e) => e.branchId === branchId);

  if (from) filtered = filtered.filter((e) => e.entryDate >= from);
  if (to) filtered = filtered.filter((e) => e.entryDate <= to);
  if (accountType && accountType !== "ALL") filtered = filtered.filter((e) => e.accountType === accountType);
  if (search) {
    filtered = filtered.filter(
      (e) =>
        e.accountName.toLowerCase().includes(search) ||
        e.description.toLowerCase().includes(search) ||
        e.reference.toLowerCase().includes(search),
    );
  }

  // Sort descending by date
  filtered.sort((a, b) => b.entryDate.localeCompare(a.entryDate));

  let runningBalance = 0;
  let totalDebits = 0;
  let totalCredits = 0;

  const entriesWithBalance = filtered.map((entry) => {
    totalDebits += entry.debit;
    totalCredits += entry.credit;
    // Standard accounting formula: Assets/Expenses increase on Debit, Liabilities/Equity/Revenue increase on Credit
    if (entry.accountType === "ASSET" || entry.accountType === "EXPENSE") {
      runningBalance += entry.debit - entry.credit;
    } else {
      runningBalance += entry.credit - entry.debit;
    }
    return {
      ...entry,
      balance: Math.round(runningBalance * 100) / 100,
    };
  });

  return NextResponse.json({
    summary: {
      totalDebits: Math.round(totalDebits * 100) / 100,
      totalCredits: Math.round(totalCredits * 100) / 100,
      netDifference: Math.round(Math.abs(totalDebits - totalCredits) * 100) / 100,
      isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
      totalEntries: filtered.length,
    },
    entries: entriesWithBalance,
  });
}

export async function POST(req: Request) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId") || "demo-branch";

  try {
    const body = await req.json();
    const { entryDate, accountName, accountType, description, reference, debit, credit } = body;

    if (!accountName || !accountType) {
      return NextResponse.json({ message: "Account name and account type are required" }, { status: 400 });
    }

    const newEntry: JournalEntry = {
      id: `jl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      branchId,
      entryDate: entryDate || new Date().toISOString().slice(0, 10),
      accountName,
      accountType,
      description: description || "Manual journal entry",
      reference: reference || `MAN-${Date.now().toString(36).toUpperCase()}`,
      debit: Number(debit || 0),
      credit: Number(credit || 0),
    };

    memoryLedger.unshift(newEntry);
    return NextResponse.json(newEntry, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "Failed to post journal entry" }, { status: 500 });
  }
}

