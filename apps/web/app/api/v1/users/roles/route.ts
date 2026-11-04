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
    .select("id, name, label")
    .eq("restaurant_id", user.restaurantId);

  return NextResponse.json(roles || []);
}

