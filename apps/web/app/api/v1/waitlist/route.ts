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

  const { data, error } = await admin
    .from("waitlist_entries")
    .select("*")
    .eq("branch_id", branchId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json([]);
  }

  const formatted = (data || []).map((w: any) => ({
    id: w.id,
    customerName: w.guest_name,
    phone: w.guest_phone,
    partySize: w.party_size,
    quotedWaitMinutes: w.estimated_wait_minutes,
    notes: w.notes || null,
    status: w.status,
    createdAt: w.created_at,
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

  const { data, error } = await admin
    .from("waitlist_entries")
    .insert({
      branch_id: branchId,
      guest_name: body.customerName || body.guestName || "Guest",
      guest_phone: body.phone || body.guestPhone || null,
      party_size: Number(body.partySize) || 2,
      estimated_wait_minutes: Number(body.quotedWaitMinutes) || 15,
      status: "WAITING",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json({
    id: data.id,
    customerName: data.guest_name,
    phone: data.guest_phone,
    partySize: data.party_size,
    quotedWaitMinutes: data.estimated_wait_minutes,
    notes: null,
    status: data.status,
    createdAt: data.created_at,
  });
}

