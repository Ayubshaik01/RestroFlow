import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSessionUser } from "@/lib/auth/server-session";

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
  if (body.price !== undefined) updates.price = body.price;
  if (body.halfPrice !== undefined) updates.half_price = body.halfPrice;
  if (body.taxRatePercent !== undefined) updates.tax_rate_percent = body.taxRatePercent;
  if (body.isVeg !== undefined) updates.is_veg = body.isVeg;
  if (body.isActive !== undefined) updates.is_available = body.isActive;
  if (body.categoryId !== undefined) updates.category_id = body.categoryId;
  if (body.stationId !== undefined) updates.kitchen_station_id = body.stationId;
  if (body.imageUrl !== undefined) updates.image_url = body.imageUrl;

  const { data, error } = await admin
    .from("menu_items")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
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

  const { error } = await admin.from("menu_items").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

