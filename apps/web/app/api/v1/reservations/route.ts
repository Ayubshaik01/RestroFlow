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

  const { data: reservations } = await admin
    .from("reservations")
    .select(
      `
      id,
      guest_name,
      guest_phone,
      guest_email,
      party_size,
      reservation_time,
      duration_minutes,
      table_id,
      status,
      special_requests,
      tables:table_id (id, number, name)
    `,
    )
    .eq("branch_id", branchId)
    .order("reservation_time", { ascending: true });

  const formatted = (reservations || []).map((r: any) => ({
    id: r.id,
    customerName: r.guest_name,
    phone: r.guest_phone,
    email: r.guest_email,
    guestCount: r.party_size,
    reservedAt: r.reservation_time,
    durationMinutes: r.duration_minutes,
    tableId: r.table_id,
    table: r.tables ? { id: r.tables.id, number: String(r.tables.number), name: r.tables.name } : null,
    specialRequests: r.special_requests,
    deposit: null,
    status: r.status,
    channel: "STAFF" as const,
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
  const { data: res, error } = await admin
    .from("reservations")
    .insert({
      branch_id: branchId,
      guest_name: body.customerName,
      guest_phone: body.phone || null,
      guest_email: body.email || null,
      party_size: body.guestCount || 2,
      reservation_time: body.reservedAt,
      table_id: body.tableId || null,
      special_requests: body.specialRequests || null,
      status: "CONFIRMED",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json(res);
}

