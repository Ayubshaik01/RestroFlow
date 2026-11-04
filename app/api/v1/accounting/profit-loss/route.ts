import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function GET() {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    orders: 142,
    grossCollected: 4850.0,
    taxCollected: 242.5,
    refunds: 45.0,
    netSales: 4562.5,
    expenses: [
      { category: "INGREDIENTS", amount: 1200.0 },
      { category: "UTILITIES", amount: 280.0 },
      { category: "MAINTENANCE", amount: 150.0 },
    ],
    totalExpenses: 1630.0,
    payrollCost: 1800.0,
    netProfit: 1132.5,
  });
}

