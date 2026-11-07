import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSessionUser } from "@/lib/auth/server-session";
import { markItemAsCombo, removeCustomMenuItem } from "@/lib/combos/combo-service";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const admin = createAdminClient();

  const updates: any = {
    updated_at: new Date().toISOString(),
  };
  if (body.name !== undefined) updates.name = body.name;
  if (body.price !== undefined) updates.price = Number(body.price);
  if (body.halfPrice !== undefined) updates.half_price = body.halfPrice ? Number(body.halfPrice) : null;
  if (body.taxRatePercent !== undefined) updates.tax_rate_percent = Number(body.taxRatePercent);
  if (body.isVeg !== undefined) updates.is_veg = Boolean(body.isVeg);
  if (body.isActive !== undefined) updates.is_available = Boolean(body.isActive);
  if (body.categoryId !== undefined && body.categoryId !== "combos") updates.category_id = body.categoryId;
  if (body.stationId !== undefined) updates.kitchen_station_id = body.stationId || null;
  if (body.imageUrl !== undefined) updates.image_url = body.imageUrl;

  if (body.isCombo !== undefined && body.isCombo) {
    markItemAsCombo(id);
  }

  try {
    const { data, error } = await admin
      .from("menu_items")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (!error && data) {
      return NextResponse.json(data);
    }
  } catch (e) {
    console.warn("Supabase update menu item fallback:", e);
  }

  return NextResponse.json({ id, ...updates, ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const admin = createAdminClient();

  try {
    await admin.from("menu_items").delete().eq("id", id);
  } catch (e) {
    console.warn("Delete menu item fallback:", e);
  }

  removeCustomMenuItem(id);
  return NextResponse.json({ ok: true });
}
