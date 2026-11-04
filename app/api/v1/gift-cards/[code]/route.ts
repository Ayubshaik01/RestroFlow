import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { code } = await params;
  const admin = createAdminClient();

  const { data: gc, error } = await admin
    .from("gift_cards")
    .select("id, code, initial_balance, current_balance, is_active, created_at")
    .eq("code", code.toUpperCase())
    .maybeSingle();

  if (error || !gc) {
    return NextResponse.json({ message: "Gift card not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: gc.id,
    code: gc.code,
    initialValue: String(gc.initial_balance),
    balance: String(gc.current_balance),
    isActive: Boolean(gc.is_active),
    createdAt: gc.created_at,
  });
}

