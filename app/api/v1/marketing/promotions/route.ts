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
    .from("promotions")
    .select("id, name, kind, value, days_of_week, start_time, end_time, is_active")
    .eq("branch_id", branchId)
    .order("created_at", { ascending: false });

  if (error || !rows) {
    return NextResponse.json([]);
  }

  const formatted = rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    kind: r.kind || "PERCENT",
    value: String(r.value),
    daysOfWeek: Array.isArray(r.days_of_week) ? r.days_of_week : [1, 2, 3, 4, 5],
    startTime: r.start_time || "11:00",
    endTime: r.end_time || "23:00",
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
    .from("promotions")
    .insert({
      branch_id: branchId,
      name: body.name,
      kind: body.kind || "PERCENT",
      value: Number(body.value),
      days_of_week: body.daysOfWeek || [1, 2, 3, 4, 5, 6, 0],
      start_time: body.startTime || "11:00",
      end_time: body.endTime || "23:00",
      is_active: true,
    })
    .select()
    .single();

  if (error || !inserted) {
    return NextResponse.json({ message: error?.message || "Failed to create promotion" }, { status: 500 });
  }

  return NextResponse.json({
    id: inserted.id,
    name: inserted.name,
    kind: inserted.kind,
    value: String(inserted.value),
    daysOfWeek: inserted.days_of_week,
    startTime: inserted.start_time,
    endTime: inserted.end_time,
    isActive: inserted.is_active,
  });
}

