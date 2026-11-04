import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { tableId } = body;
  const admin = createAdminClient();

  // 1. Mark waitlist entry seated
  const { data: entry, error } = await admin
    .from("waitlist_entries")
    .update({
      status: "SEATED",
      table_id: tableId || null,
      seated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  // 2. Update table to OCCUPIED
  if (tableId) {
    await admin
      .from("tables")
      .update({
        status: "OCCUPIED",
        status_since: new Date().toISOString(),
      })
      .eq("id", tableId);
  }

  return NextResponse.json({ ok: true, entry });
}

