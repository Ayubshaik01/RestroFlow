import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getServerSessionUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const reason = body.reason || "Kitchen rejected ticket";

    const admin = createAdminClient();

    const { error } = await admin
      .from("kots")
      .update({
        status: "REJECTED",
        reject_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, status: "REJECTED" });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Failed to reject ticket" }, { status: 500 });
  }
}

