import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function GET() {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Find latest open attendance for current user
  const { data: record } = await admin
    .from("attendance")
    .select("id, branch_id, user_id, clock_in_at, clock_out_at, note, users:user_id (id, name)")
    .eq("user_id", user.id)
    .is("clock_out_at", null)
    .order("clock_in_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!record) {
    return NextResponse.json(null);
  }

  const userData: any = Array.isArray(record.users) ? record.users[0] : record.users;

  return NextResponse.json({
    id: record.id,
    branchId: record.branch_id,
    userId: record.user_id,
    user: { id: userData?.id || user.id, name: userData?.name || user.name },
    clockInAt: record.clock_in_at,
    clockOutAt: record.clock_out_at,
    note: record.note,
  });
}

