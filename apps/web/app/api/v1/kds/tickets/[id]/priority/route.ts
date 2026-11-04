import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getServerSessionUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const isPriority = Boolean(body.isPriority);

    const admin = createAdminClient();

    const { error } = await admin
      .from("kots")
      .update({
        priority: isPriority ? "HIGH" : "NORMAL",
        is_priority: isPriority,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, isPriority });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Failed to set priority" }, { status: 500 });
  }
}

