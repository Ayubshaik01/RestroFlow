import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function GET(req: Request) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || new Date().toISOString().slice(0, 10);
  const openingFloat = Number(searchParams.get("openingFloat") || 200);

  const cashSales = 840.5;
  const cashExpenses = 45.0;
  const expectedCash = openingFloat + cashSales - cashExpenses;

  return NextResponse.json({
    businessDate: date,
    openingFloat,
    cashSales,
    cashExpenses,
    expectedCash,
  });
}

