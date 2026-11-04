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
    .from("gift_cards")
    .select("id, code, initial_balance, current_balance, is_active, created_at")
    .order("created_at", { ascending: false });

  if (error || !rows) {
    return NextResponse.json([]);
  }

  const formatted = rows.map((r: any) => ({
    id: r.id,
    code: r.code,
    initialValue: String(r.initial_balance),
    balance: String(r.current_balance),
    isActive: Boolean(r.is_active),
    createdAt: r.created_at,
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

  const code = (body.code || `GC-${Math.random().toString(36).substring(2, 8)}`).toUpperCase();
  const value = Number(body.initialValue || body.amount || 50);

  const { data: inserted, error } = await admin
    .from("gift_cards")
    .insert({
      restaurant_id: "demo-restaurant",
      code,
      initial_balance: value,
      current_balance: value,
      is_active: true,
    })
    .select()
    .single();

  if (error || !inserted) {
    return NextResponse.json({ message: error?.message || "Failed to issue gift card" }, { status: 500 });
  }

  return NextResponse.json({
    id: inserted.id,
    code: inserted.code,
    initialValue: String(inserted.initial_balance),
    balance: String(inserted.current_balance),
    isActive: inserted.is_active,
    createdAt: inserted.created_at,
  });
}

