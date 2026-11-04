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

  const { data: rows, error } = await admin
    .from("waste_logs")
    .select(
      `
      id,
      ingredient_id,
      quantity,
      reason,
      notes,
      created_at,
      ingredients:ingredient_id (id, name, unit, cost_per_unit),
      users:created_by_id (id, name)
    `,
    )
    .eq("branch_id", branchId)
    .order("created_at", { ascending: false });

  if (error || !rows) {
    return NextResponse.json([]);
  }

  const formatted = rows.map((r: any) => {
    const ingData: any = Array.isArray(r.ingredients) ? r.ingredients[0] : r.ingredients;
    const userData: any = Array.isArray(r.users) ? r.users[0] : r.users;

    return {
      id: r.id,
      ingredientId: r.ingredient_id,
      ingredient: {
        id: ingData?.id || r.ingredient_id,
        name: ingData?.name || "Ingredient",
        unit: ingData?.unit || "KG",
      },
      quantity: String(r.quantity),
      reason: r.reason,
      unitCostAtWaste: String(ingData?.cost_per_unit || "0.00"),
      notes: r.notes,
      createdBy: {
        id: userData?.id || user.id,
        name: userData?.name || user.name,
      },
      createdAt: r.created_at,
    };
  });

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

  const { data: inserted, error } = await admin
    .from("waste_logs")
    .insert({
      branch_id: branchId,
      ingredient_id: body.ingredientId,
      quantity: Number(body.quantity),
      reason: body.reason,
      notes: body.notes || null,
      created_by_id: user.id,
    })
    .select()
    .single();

  if (error || !inserted) {
    return NextResponse.json({ message: error?.message || "Failed to record waste" }, { status: 500 });
  }

  return NextResponse.json(inserted);
}

