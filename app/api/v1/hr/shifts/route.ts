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
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const admin = createAdminClient();

  let query = admin
    .from("shifts")
    .select("id, user_id, starts_at, ends_at, note, users:user_id (id, name)")
    .eq("branch_id", branchId)
    .order("starts_at", { ascending: true });

  if (from) query = query.gte("starts_at", from);
  if (to) query = query.lte("ends_at", to);

  const { data: rows, error } = await query;
  if (error || !rows) {
    return NextResponse.json([]);
  }

  const formatted = rows.map((r: any) => {
    const userData: any = Array.isArray(r.users) ? r.users[0] : r.users;
    return {
      id: r.id,
      userId: r.user_id,
      user: { id: userData?.id || r.user_id, name: userData?.name || "Staff" },
      startsAt: r.starts_at,
      endsAt: r.ends_at,
      note: r.note,
    };
  });

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
    .from("shifts")
    .insert({
      branch_id: branchId,
      user_id: body.userId,
      starts_at: body.startsAt,
      ends_at: body.endsAt,
      note: body.note || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(inserted);
}

