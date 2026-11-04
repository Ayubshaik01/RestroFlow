import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function POST(req: Request) {
  try {
    const user = await getServerSessionUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const branchId = body.branchId || "demo-branch";
    const admin = createAdminClient();

    const { data: inserted, error } = await admin
      .from("attendance")
      .insert({
        branch_id: branchId,
        user_id: user.id,
        clock_in_at: new Date().toISOString(),
        note: body.note || null,
      })
      .select("id, branch_id, user_id, clock_in_at, clock_out_at, note")
      .single();

    if (error || !inserted) {
      return NextResponse.json({ message: error?.message || "Failed to clock in" }, { status: 500 });
    }

    return NextResponse.json({
      id: inserted.id,
      branchId: inserted.branch_id,
      userId: inserted.user_id,
      user: { id: user.id, name: user.name },
      clockInAt: inserted.clock_in_at,
      clockOutAt: inserted.clock_out_at,
      note: inserted.note,
    });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Failed to clock in" }, { status: 500 });
  }
}

