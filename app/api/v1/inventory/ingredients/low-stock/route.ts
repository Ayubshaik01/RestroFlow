import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function GET(req: Request) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId") || "demo-branch";
  const admin = createAdminClient();

  const { data: ingredients } = await admin
    .from("ingredients")
    .select("*")
    .eq("branch_id", branchId)
    .filter("current_stock", "lte", "reorder_level");

  const formatted = (ingredients || []).map((i) => ({
    id: i.id,
    name: i.name,
    sku: i.sku,
    unit: i.unit,
    currentStock: String(i.current_stock),
    reorderLevel: String(i.reorder_level),
    costPerUnit: String(i.cost_per_unit),
    isActive: i.is_active,
  }));

  return NextResponse.json(formatted);
}

