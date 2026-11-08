import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/server-session";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId") || "demo-branch";
  const admin = createAdminClient();

  const now = new Date();
  const days: { date: string; amount: number }[] = [];
  const waste: { date: string; cost: number }[] = [];

  const dateMap = new Map<string, number>();
  const wasteMap = new Map<string, number>();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    dateMap.set(dateStr, 0);
    wasteMap.set(dateStr, 0);
  }

  const startDate = Array.from(dateMap.keys())[0];

  try {
    const { data: orders } = await admin
      .from("orders")
      .select("total_amount, created_at, status")
      .eq("branch_id", branchId)
      .in("status", ["PAID", "COMPLETED", "DELIVERED"])
      .gte("created_at", `${startDate}T00:00:00.000Z`);

    (orders || []).forEach((o: any) => {
      const d = (o.created_at || "").slice(0, 10);
      if (dateMap.has(d)) {
        dateMap.set(d, (dateMap.get(d) || 0) + Number(o.total_amount || 0));
      }
    });

    const { data: wasteLogs } = await admin
      .from("inventory_waste")
      .select("cost, created_at")
      .eq("branch_id", branchId)
      .gte("created_at", `${startDate}T00:00:00.000Z`);

    (wasteLogs || []).forEach((w: any) => {
      const d = (w.created_at || "").slice(0, 10);
      if (wasteMap.has(d)) {
        wasteMap.set(d, (wasteMap.get(d) || 0) + Number(w.cost || 0));
      }
    });
  } catch {
    // fallback safe
  }

  dateMap.forEach((amount, date) => {
    days.push({ date, amount: Math.round(amount * 100) / 100 });
  });

  wasteMap.forEach((cost, date) => {
    waste.push({ date, cost: Math.round(cost * 100) / 100 });
  });

  return NextResponse.json({ revenue: days, waste });
}
