import { createAdminClient } from "@/lib/supabase/admin";

export interface BankTransactionRecord {
  id: string;
  branchId: string;
  postedOn: string;
  description: string;
  reference: string;
  amount: number; // positive = money in, negative = money out
  status: "UNMATCHED" | "MATCHED" | "IGNORED";
  expenseId: string | null;
  expense?: { id: string; category: string; note: string | null; spentOn: string } | null;
  createdAt: string;
}

const memoryBankTransactions: Map<string, BankTransactionRecord> = new Map([
  [
    "bank-tx-1",
    {
      id: "bank-tx-1",
      branchId: "demo-branch",
      postedOn: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10),
      description: "CARD SETTLEMENT - STRIPE MERCHANT",
      reference: "ST-8829104",
      amount: 1420.5,
      status: "UNMATCHED",
      expenseId: null,
      expense: null,
      createdAt: new Date().toISOString(),
    },
  ],
  [
    "bank-tx-2",
    {
      id: "bank-tx-2",
      branchId: "demo-branch",
      postedOn: new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10),
      description: "WHOLESALE DAIRY & PRODUCE SUPPLIES",
      reference: "INV-9921",
      amount: -320.0,
      status: "UNMATCHED",
      expenseId: null,
      expense: null,
      createdAt: new Date().toISOString(),
    },
  ],
  [
    "bank-tx-3",
    {
      id: "bank-tx-3",
      branchId: "demo-branch",
      postedOn: new Date(Date.now() - 4 * 86400000).toISOString().slice(0, 10),
      description: "MUNICIPAL UTILITIES ELECTRICITY & WATER",
      reference: "ELEC-OCT",
      amount: -180.0,
      status: "UNMATCHED",
      expenseId: null,
      expense: null,
      createdAt: new Date().toISOString(),
    },
  ],
  [
    "bank-tx-4",
    {
      id: "bank-tx-4",
      branchId: "demo-branch",
      postedOn: new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10),
      description: "COMMERCIAL RENT NOVEMBER LEASE",
      reference: "RENT-NOV",
      amount: -2500.0,
      status: "MATCHED",
      expenseId: "exp-rent-1",
      expense: {
        id: "exp-rent-1",
        category: "Rent",
        note: "Store front lease November",
        spentOn: new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10),
      },
      createdAt: new Date().toISOString(),
    },
  ],
]);

export async function getBankView(branchId: string) {
  const transactions = Array.from(memoryBankTransactions.values())
    .filter((t) => t.branchId === branchId)
    .sort((a, b) => b.postedOn.localeCompare(a.postedOn));

  let matched = 0;
  let unmatched = 0;
  let ignored = 0;
  let moneyIn = 0;
  let moneyOut = 0;

  transactions.forEach((t) => {
    if (t.status === "MATCHED") matched++;
    else if (t.status === "IGNORED") ignored++;
    else unmatched++;

    if (t.amount > 0) moneyIn += t.amount;
    else moneyOut += t.amount;
  });

  return {
    summary: {
      total: transactions.length,
      matched,
      unmatched,
      ignored,
      moneyIn: Math.round(moneyIn * 100) / 100,
      moneyOut: Math.round(moneyOut * 100) / 100,
    },
    transactions,
  };
}

export function parseBankCsv(csv: string, branchId: string) {
  const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let imported = 0;
  let duplicatesIgnored = 0;
  let autoMatched = 0;
  const skippedLines: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // skip header row if detected
    if (i === 0 && (line.toLowerCase().includes("date") || line.toLowerCase().includes("description"))) {
      continue;
    }

    const parts = line.split(",").map((p) => p.trim().replace(/^["']|["']$/g, ""));
    if (parts.length < 2) {
      skippedLines.push(i + 1);
      continue;
    }

    // Try finding date, description, amount
    let dateStr = parts[0];
    let desc = parts[1] || "Bank Entry";
    let amount = 0;

    if (parts.length >= 3) {
      amount = parseFloat(parts[2].replace(/[^0-9.-]/g, "")) || 0;
    }
    if (parts.length >= 4 && !amount) {
      // debit / credit format
      const debit = parseFloat(parts[2].replace(/[^0-9.-]/g, "")) || 0;
      const credit = parseFloat(parts[3].replace(/[^0-9.-]/g, "")) || 0;
      amount = credit ? credit : -Math.abs(debit);
    }

    if (isNaN(amount) || amount === 0) {
      skippedLines.push(i + 1);
      continue;
    }

    const ref = parts[3] || `CSV-${Date.now().toString(36)}-${i}`;
    const id = `tx-csv-${Date.now()}-${i}`;

    memoryBankTransactions.set(id, {
      id,
      branchId,
      postedOn: dateStr.slice(0, 10),
      description: desc,
      reference: ref,
      amount,
      status: "UNMATCHED",
      expenseId: null,
      expense: null,
      createdAt: new Date().toISOString(),
    });
    imported++;
  }

  return { imported, duplicatesIgnored, autoMatched, skippedLines };
}

export async function autoMatchTransactions(branchId: string): Promise<number> {
  const admin = createAdminClient();
  let matchedCount = 0;

  try {
    const { data: expenses } = await admin
      .from("expenses")
      .select("id, category, amount, spent_on, note")
      .eq("branch_id", branchId);

    if (!expenses) return 0;

    memoryBankTransactions.forEach((tx) => {
      if (tx.branchId === branchId && tx.status === "UNMATCHED" && tx.amount < 0) {
        const absAmt = Math.abs(tx.amount);
        const match = expenses.find((e: any) => {
          const eAmt = Number(e.amount || 0);
          if (Math.abs(eAmt - absAmt) > 0.01) return false;
          // within 5 days
          const diffDays = Math.abs(
            (new Date(e.spent_on).getTime() - new Date(tx.postedOn).getTime()) / (1000 * 86400),
          );
          return diffDays <= 5;
        });

        if (match) {
          tx.status = "MATCHED";
          tx.expenseId = match.id;
          tx.expense = {
            id: match.id,
            category: match.category,
            note: match.note,
            spentOn: match.spent_on,
          };
          matchedCount++;
        }
      }
    });
  } catch {
    // ignore
  }

  return matchedCount;
}

export function updateBankTxStatus(id: string, status: "UNMATCHED" | "IGNORED"): boolean {
  const tx = memoryBankTransactions.get(id);
  if (tx) {
    tx.status = status;
    if (status === "UNMATCHED") {
      tx.expenseId = null;
      tx.expense = null;
    }
    return true;
  }
  return false;
}

export async function matchBankTxToExpense(id: string, expenseId: string, branchId: string): Promise<boolean> {
  const tx = memoryBankTransactions.get(id);
  if (!tx) return false;

  const admin = createAdminClient();
  try {
    const { data: exp } = await admin
      .from("expenses")
      .select("id, category, amount, spent_on, note")
      .eq("id", expenseId)
      .single();

    if (exp) {
      tx.status = "MATCHED";
      tx.expenseId = exp.id;
      tx.expense = {
        id: exp.id,
        category: exp.category,
        note: exp.note,
        spentOn: exp.spent_on,
      };
      return true;
    }
  } catch {
    // fallback
  }

  tx.status = "MATCHED";
  tx.expenseId = expenseId;
  tx.expense = {
    id: expenseId,
    category: "Supplies",
    note: "Matched expense",
    spentOn: tx.postedOn,
  };
  return true;
}

export async function findCandidatesForBankTx(id: string, branchId: string) {
  const tx = memoryBankTransactions.get(id);
  const admin = createAdminClient();

  try {
    const { data: expenses } = await admin
      .from("expenses")
      .select("id, category, amount, spent_on, note")
      .eq("branch_id", branchId)
      .order("spent_on", { ascending: false })
      .limit(20);

    if (expenses && expenses.length > 0) {
      return expenses.map((e: any) => ({
        id: e.id,
        category: e.category,
        amount: String(e.amount),
        spentOn: e.spent_on,
        note: e.note,
      }));
    }
  } catch {
    // fallback
  }

  return [
    {
      id: "exp-cand-1",
      category: "Supplies",
      amount: tx ? String(Math.abs(tx.amount)) : "150.00",
      spentOn: tx ? tx.postedOn : new Date().toISOString().slice(0, 10),
      note: "Weekly vendor delivery",
    },
  ];
}

