import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function GET() {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: roles } = await admin
    .from("roles")
    .select(
      `
      id,
      name,
      label,
      is_system,
      created_at,
      role_permissions (
        permissions (
          key,
          label,
          category
        )
      )
    `,
    )
    .eq("restaurant_id", user.restaurantId);

  const formatted = (roles || []).map((r: any) => ({
    id: r.id,
    name: r.name,
    label: r.label,
    isSystem: r.is_system,
    createdAt: r.created_at,
    permissions: (r.role_permissions || []).map((rp: any) => ({
      permission: {
        key: rp.permissions?.key || "",
        label: rp.permissions?.label || "",
        category: rp.permissions?.category || "",
      },
    })),
  }));

  return NextResponse.json(formatted);
}

