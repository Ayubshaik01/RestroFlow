import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function GET(req: Request) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: rows, error } = await admin
    .from("coupons")
    .select("id, code, kind, value, min_order_amount, max_discount, valid_until, usage_limit, used_count, is_active")
    .order("created_at", { ascending: false });

  if (error || !rows) {
    return NextResponse.json([]);
  }

  const formatted = rows.map((r: any) => ({
    id: r.id,
    code: r.code,
    kind: r.kind || "PERCENT",
    value: String(r.value),
    minOrderAmount: String(r.min_order_amount || "0"),
    maxDiscount: r.max_discount ? String(r.max_discount) : null,
    validUntil: r.valid_until,
    usageLimit: r.usage_limit,
    usedCount: r.used_count || 0,
    isActive: Boolean(r.is_active),
  }));

  return NextResponse.json(formatted);
}

export async function POST(req: Request) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const admin = createAdminClient();

  const { data: inserted, error } = await admin
    .from("coupons")
    .insert({
      restaurant_id: "demo-restaurant",
      code: body.code.toUpperCase(),
      kind: body.kind || "PERCENT",
      value: Number(body.value),
      min_order_amount: Number(body.minOrderAmount || 0),
      max_discount: body.maxDiscount ? Number(body.maxDiscount) : null,
      valid_until: body.validUntil || null,
      usage_limit: body.usageLimit ? Number(body.usageLimit) : null,
      is_active: true,
    })
    .select()
    .single();

  if (error || !inserted) {
    return NextResponse.json({ message: error?.message || "Failed to create coupon" }, { status: 500 });
  }

  return NextResponse.json({
    id: inserted.id,
    code: inserted.code,
    kind: inserted.kind,
    value: String(inserted.value),
    minOrderAmount: String(inserted.min_order_amount),
    maxDiscount: inserted.max_discount ? String(inserted.max_discount) : null,
    validUntil: inserted.valid_until,
    usageLimit: inserted.usage_limit,
    usedCount: inserted.used_count || 0,
    isActive: inserted.is_active,
  });
}

