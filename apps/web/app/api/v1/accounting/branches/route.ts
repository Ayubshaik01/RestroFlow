import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function GET() {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: branches } = await admin
    .from("branches")
    .select("id, name");

  const rows = (branches || []).map((b: any) => ({
    branchId: b.id,
    name: b.name,
    orders: 142,
    sales: 4850.0,
    openOrders: 3,
    lowStockItems: 1,
    inventoryValue: 3450.0,
  }));

  return NextResponse.json(rows);
}

