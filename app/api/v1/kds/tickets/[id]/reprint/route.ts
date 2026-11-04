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
    const admin = createAdminClient();

    const { data: ticket } = await admin
      .from("kots")
      .select("printed_count")
      .eq("id", id)
      .single();

    const count = (ticket?.printed_count || 1) + 1;

    await admin
      .from("kots")
      .update({ printed_count: count })
      .eq("id", id);

    return NextResponse.json({ ok: true, printedCount: count, reprint: true });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Failed to reprint ticket" }, { status: 500 });
  }
}

