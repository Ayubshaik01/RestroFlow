import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function GET() {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Generate last 7 days trends
  const days: { date: string; amount: number }[] = [];
  const waste: { date: string; cost: number }[] = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    days.push({
      date: dateStr,
      amount: Math.floor(12000 + Math.random() * 8000),
    });
    waste.push({
      date: dateStr,
      cost: Math.floor(200 + Math.random() * 300),
    });
  }

  return NextResponse.json({ revenue: days, waste });
}

