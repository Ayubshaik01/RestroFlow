import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/server-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBudgetsForMonth, setBudget } from "./budget-store";

export async function GET(req: Request) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId") || "demo-branch";
  const month = searchParams.get("month") || new Date().toISOString().slice(0, 7);

  const budgets = await getBudgetsForMonth(branchId, month);

  // Fetch actual expenses for this month from Supabase
  const admin = createAdminClient();
  const startDate = `${month}-01`;
  const endDate = `${month}-31`;

  const actualMap = new Map<string, number>();

  try {
    const { data: expenses } = await admin
      .from("expenses")
      .select("category, amount")
      .eq("branch_id", branchId)
      .gte("spent_on", startDate)
      .lte("spent_on", endDate);

    (expenses || []).forEach((e: any) => {
      const cat = (e.category || "General").trim();
      actualMap.set(cat, (actualMap.get(cat) || 0) + Number(e.amount || 0));
    });
  } catch {
    // ignore
  }

  // Categories accounted for in budgets
  const budgetedCategories = new Set<string>();

  const rows = budgets.map((b) => {
    budgetedCategories.add(b.category.toLowerCase());
    // Match actual case-insensitively
    let actual = 0;
    actualMap.forEach((amt, cat) => {
      if (cat.toLowerCase() === b.category.toLowerCase()) {
        actual += amt;
      }
    });

    const budget = b.amount;
    const remaining = Math.round((budget - actual) * 100) / 100;
    const percentUsed = budget > 0 ? Math.round((actual / budget) * 100) : 0;

    return {
      id: b.id,
      category: b.category,
      budget,
      actual: Math.round(actual * 100) / 100,
      remaining,
      percentUsed,
    };
  });

  // Any expense categories spent this month without a formal budget
  const unbudgeted: { category: string; actual: number }[] = [];
  actualMap.forEach((amt, cat) => {
    if (!budgetedCategories.has(cat.toLowerCase())) {
      unbudgeted.push({
        category: cat,
        actual: Math.round(amt * 100) / 100,
      });
    }
  });

  const totalBudget = rows.reduce((s, r) => s + r.budget, 0);
  const totalActual =
    rows.reduce((s, r) => s + r.actual, 0) + unbudgeted.reduce((s, u) => s + u.actual, 0);
  const remaining = Math.round((totalBudget - totalActual) * 100) / 100;

  return NextResponse.json({
    month,
    rows,
    unbudgeted,
    totalBudget: Math.round(totalBudget * 100) / 100,
    totalActual: Math.round(totalActual * 100) / 100,
    remaining,
  });
}

export async function PUT(req: Request) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId") || "demo-branch";

  try {
    const body = await req.json();
    const { month, category, amount } = body;

    if (!month || !category || typeof amount !== "number") {
      return NextResponse.json({ message: "Month, category, and numeric amount are required" }, { status: 400 });
    }

    const saved = await setBudget(branchId, month, category.trim(), amount);
    return NextResponse.json(saved);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "Failed to save budget" }, { status: 500 });
  }
}

