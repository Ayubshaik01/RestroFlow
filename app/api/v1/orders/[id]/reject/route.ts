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
    const reason = body.reason || "Declined by restaurant";

    const admin = createAdminClient();

    const { data: order } = await admin
      .from("orders")
      .select("table_id")
      .eq("id", id)
      .single();

    const { error } = await admin
      .from("orders")
      .update({
        acceptance: "REJECTED",
        status: "CANCELLED",
        cancel_source: "ONLINE_DECLINED",
        cancel_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    // Free table if any
    if (order?.table_id) {
      const { count } = await admin
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("table_id", order.table_id)
        .eq("status", "OPEN");

      if (!count || count === 0) {
        await admin
          .from("tables")
          .update({ status: "AVAILABLE", status_since: new Date().toISOString() })
          .eq("id", order.table_id);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Failed to reject order" }, { status: 500 });
  }
}

