import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function GET() {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: notifications } = await admin
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  const formatted = (notifications || []).map((n) => ({
    id: n.id,
    branchId: n.branch_id,
    recipientUserId: n.recipient_user_id,
    type: n.type,
    title: n.title,
    body: n.body,
    entity: n.entity,
    entityId: n.entity_id,
    readAt: n.read_at,
    createdAt: n.created_at,
  }));

  const unreadCount = formatted.filter((n) => !n.readAt).length;

  return NextResponse.json({
    data: formatted,
    total: formatted.length,
    unreadCount,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  });
}

