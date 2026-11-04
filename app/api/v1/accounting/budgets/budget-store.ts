import { createAdminClient } from "@/lib/supabase/admin";

export interface BudgetItem {
  id: string;
  branchId: string;
  month: string; // YYYY-MM
  category: string;
  amount: number;
}

const memoryBudgets: Map<string, BudgetItem> = new Map([
  ["b-1", { id: "b-1", branchId: "demo-branch", month: new Date().toISOString().slice(0, 7), category: "Rent", amount: 2500 }],
  ["b-2", { id: "b-2", branchId: "demo-branch", month: new Date().toISOString().slice(0, 7), category: "Supplies", amount: 1800 }],
  ["b-3", { id: "b-3", branchId: "demo-branch", month: new Date().toISOString().slice(0, 7), category: "Utilities", amount: 600 }],
  ["b-4", { id: "b-4", branchId: "demo-branch", month: new Date().toISOString().slice(0, 7), category: "Marketing", amount: 400 }],
]);

export async function getBudgetsForMonth(branchId: string, month: string): Promise<BudgetItem[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("budgets")
      .select("*")
      .eq("branch_id", branchId)
      .eq("month", month);

    if (data && data.length > 0) {
      return data.map((b: any) => ({
        id: b.id,
        branchId: b.branch_id,
        month: b.month,
        category: b.category,
        amount: Number(b.amount || 0),
      }));
    }
  } catch {
    // fallback
  }

  return Array.from(memoryBudgets.values()).filter(
    (b) => b.branchId === branchId && b.month === month,
  );
}

export async function setBudget(branchId: string, month: string, category: string, amount: number): Promise<BudgetItem> {
  const existing = Array.from(memoryBudgets.values()).find(
    (b) => b.branchId === branchId && b.month === month && b.category.toLowerCase() === category.toLowerCase(),
  );

  const id = existing?.id || `b-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const item: BudgetItem = { id, branchId, month, category, amount };

  try {
    const admin = createAdminClient();
    await admin.from("budgets").upsert({
      id,
      branch_id: branchId,
      month,
      category,
      amount,
    });
  } catch {
    // fallback
  }

  memoryBudgets.set(id, item);
  return item;
}

export async function removeBudget(id: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    await admin.from("budgets").delete().eq("id", id);
  } catch {
    // fallback
  }

  memoryBudgets.delete(id);
  return true;
}

