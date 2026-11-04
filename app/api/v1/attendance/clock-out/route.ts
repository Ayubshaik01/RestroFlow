import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function POST() {
  try {
    const user = await getServerSessionUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Find latest open attendance
    const { data: record } = await admin
      .from("attendance")
      .select("id, branch_id")
      .eq("user_id", user.id)
      .is("clock_out_at", null)
      .order("clock_in_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!record) {
      return NextResponse.json({ message: "No active clock-in found" }, { status: 400 });
    }

    const clockOutTime = new Date().toISOString();
    const { data: updated, error } = await admin
      .from("attendance")
      .update({
        clock_out_at: clockOutTime,
      })
      .eq("id", record.id)
      .select("id, branch_id, user_id, clock_in_at, clock_out_at, note")
      .single();

    if (error || !updated) {
      return NextResponse.json({ message: error?.message || "Failed to clock out" }, { status: 500 });
    }

    return NextResponse.json({
      id: updated.id,
      branchId: updated.branch_id,
      userId: updated.user_id,
      user: { id: user.id, name: user.name },
      clockInAt: updated.clock_in_at,
      clockOutAt: updated.clock_out_at,
      note: updated.note,
    });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Failed to clock out" }, { status: 500 });
  }
}

