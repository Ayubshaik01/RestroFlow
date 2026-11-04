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
    .order("name", { ascending: true });

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

export async function POST(req: Request) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId") || "demo-branch";
  const body = await req.json();

  const admin = createAdminClient();
  const { data: ing, error } = await admin
    .from("ingredients")
    .insert({
      branch_id: branchId,
      name: body.name,
      sku: body.sku || null,
      unit: body.unit || "KG",
      reorder_level: body.reorderLevel || 0,
      current_stock: body.currentStock || 0,
      cost_per_unit: body.costPerUnit || 0,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json({
    id: ing.id,
    name: ing.name,
    sku: ing.sku,
    unit: ing.unit,
    currentStock: String(ing.current_stock),
    reorderLevel: String(ing.reorder_level),
    costPerUnit: String(ing.cost_per_unit),
    isActive: ing.is_active,
  });
}

