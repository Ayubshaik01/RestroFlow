import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/server-session";
import { matchBankTxToExpense } from "../../bank-store";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId") || "demo-branch";

  try {
    const { expenseId } = await req.json();
    if (!expenseId) {
      return NextResponse.json({ message: "Expense ID is required" }, { status: 400 });
    }

    const success = await matchBankTxToExpense(id, expenseId, branchId);
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "Failed to match transaction" }, { status: 500 });
  }
}

