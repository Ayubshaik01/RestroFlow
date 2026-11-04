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

  const updates: Record<string, any> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.fee !== undefined) updates.fee = Number(body.fee);
  if (body.minOrderAmount !== undefined) updates.min_order_amount = Number(body.minOrderAmount);
  if (body.etaMinutes !== undefined) updates.eta_minutes = Number(body.etaMinutes);
  if (body.pincodes !== undefined) updates.pincodes = body.pincodes;
  if (body.isActive !== undefined) updates.is_active = body.isActive;

  const { data: updated, error } = await admin
    .from("delivery_zones")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error || !updated) {
    return NextResponse.json({ message: error?.message || "Failed to update zone" }, { status: 500 });
  }

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    fee: String(updated.fee),
    minOrderAmount: String(updated.min_order_amount),
    etaMinutes: updated.eta_minutes,
    pincodes: updated.pincodes,
    isActive: updated.is_active,
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const admin = createAdminClient();

  const { error } = await admin.from("delivery_zones").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

