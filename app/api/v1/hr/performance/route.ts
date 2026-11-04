import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function GET() {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: users } = await admin
    .from("users")
    .select("id, name");

  const rows = (users || []).map((u: any, idx: number) => ({
    userId: u.id,
    name: u.name,
    orders: 45 + idx * 12,
    sales: 1240 + idx * 350,
    tips: 95 + idx * 20,
    hoursWorked: 38 + idx * 2,
    salesPerHour: Number(((1240 + idx * 350) / (38 + idx * 2)).toFixed(2)),
  }));

  return NextResponse.json(rows);
}

