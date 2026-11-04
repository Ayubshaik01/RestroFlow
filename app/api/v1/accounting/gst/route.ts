import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function GET() {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    orders: 142,
    rows: [
      { ratePercent: 5, taxableValue: 3500.0, tax: 175.0, total: 3675.0 },
      { ratePercent: 12, taxableValue: 1200.0, tax: 144.0, total: 1344.0 },
    ],
    totalTaxable: 4700.0,
    totalTax: 319.0,
  });
}

