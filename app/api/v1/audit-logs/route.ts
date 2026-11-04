import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function GET() {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: logs } = await admin
    .from("audit_logs")
    .select(
      `
      id,
      user_id,
      action,
      entity,
      entity_id,
      metadata,
      created_at,
      users:user_id (id, name)
    `,
    )
    .order("created_at", { ascending: false })
    .limit(50);

  const formatted = (logs || []).map((l: any) => ({
    id: l.id,
    userId: l.user_id,
    user: l.users ? { id: l.users.id, name: l.users.name } : null,
    action: l.action,
    entity: l.entity,
    entityId: l.entity_id,
    metadata: l.metadata,
    createdAt: l.created_at,
  }));

  return NextResponse.json({
    data: formatted,
    total: formatted.length,
    page: 1,
    pageSize: 50,
    totalPages: 1,
  });
}

