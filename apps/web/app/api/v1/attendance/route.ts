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
  const date = searchParams.get("date");

  const admin = createAdminClient();

  let query = admin
    .from("attendance")
    .select("id, branch_id, user_id, clock_in_at, clock_out_at, note, users:user_id (id, name)")
    .eq("branch_id", branchId)
    .order("clock_in_at", { ascending: false });

  if (date) {
    query = query.gte("clock_in_at", `${date}T00:00:00.000Z`).lte("clock_in_at", `${date}T23:59:59.999Z`);
  }

  const { data: rows, error } = await query;
  if (error || !rows) {
    return NextResponse.json([]);
  }

  const formatted = rows.map((r: any) => {
    const userData: any = Array.isArray(r.users) ? r.users[0] : r.users;
    return {
      id: r.id,
      branchId: r.branch_id,
      userId: r.user_id,
      user: { id: userData?.id || r.user_id, name: userData?.name || "Staff" },
      clockInAt: r.clock_in_at,
      clockOutAt: r.clock_out_at,
      note: r.note,
    };
  });

  return NextResponse.json(formatted);
}

