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
    .from("delivery_zones")
    .select("id, name, fee, min_order_amount, eta_minutes, pincodes, is_active")
    .eq("branch_id", branchId)
    .order("created_at", { ascending: true });

  if (error || !rows) {
    return NextResponse.json([]);
  }

  const formatted = rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    fee: String(r.fee),
    minOrderAmount: String(r.min_order_amount),
    etaMinutes: r.eta_minutes,
    pincodes: Array.isArray(r.pincodes) ? r.pincodes : [],
    isActive: Boolean(r.is_active),
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

  const { data: inserted, error } = await admin
    .from("delivery_zones")
    .insert({
      branch_id: branchId,
      name: body.name,
      fee: Number(body.fee || 0),
      min_order_amount: Number(body.minOrderAmount || 0),
      eta_minutes: Number(body.etaMinutes || 30),
      pincodes: body.pincodes || [],
      is_active: body.isActive !== false,
    })
    .select()
    .single();

  if (error || !inserted) {
    return NextResponse.json({ message: error?.message || "Failed to create delivery zone" }, { status: 500 });
  }

  return NextResponse.json({
    id: inserted.id,
    name: inserted.name,
    fee: String(inserted.fee),
    minOrderAmount: String(inserted.min_order_amount),
    etaMinutes: inserted.eta_minutes,
    pincodes: inserted.pincodes,
    isActive: inserted.is_active,
  });
}

