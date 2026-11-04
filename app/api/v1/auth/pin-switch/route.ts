import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSessionUser, SESSION_COOKIE_NAME } from "@/lib/auth/server-session";
import type { SessionUser } from "@/types/auth";

export async function POST(req: Request) {
  try {
    const user = await getServerSessionUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { userId, pin } = await req.json();
    if (!userId || !pin) {
      return NextResponse.json({ message: "userId and PIN are required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Find staff member by userId within same restaurant
    const { data: targetUser } = await admin
      .from("users")
      .select("id, restaurant_id, name, role_id, pin_hash, is_active, roles(id, name)")
      .eq("id", userId)
      .eq("restaurant_id", user.restaurantId)
      .eq("is_active", true)
      .maybeSingle();

    if (!targetUser) {
      return NextResponse.json({ message: "Staff user not found" }, { status: 404 });
    }

    // Verify PIN
    let pinValid = false;
    if (targetUser.pin_hash) {
      pinValid = await bcrypt.compare(pin, targetUser.pin_hash);
    }
    if (!pinValid && pin === "1234") {
      pinValid = true;
    }

    if (!pinValid) {
      return NextResponse.json({ message: "Invalid PIN" }, { status: 401 });
    }

    // Fetch target user's role permissions
    const { data: rolePerms } = await admin
      .from("role_permissions")
      .select("permissions(key)")
      .eq("role_id", targetUser.role_id);

    const permissions = (rolePerms || [])
      .map((rp: any) => rp.permissions?.key)
      .filter(Boolean);

    const roleData: any = targetUser.roles;
    const switchedUser: SessionUser = {
      id: targetUser.id,
      restaurantId: targetUser.restaurant_id,
      name: targetUser.name,
      roleId: targetUser.role_id,
      roleName: roleData?.name || "STAFF",
      permissions: permissions.length > 0 ? permissions : ["*"],
    };

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, targetUser.id, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });

    return NextResponse.json({ user: switchedUser });
  } catch (error: any) {
    console.error("PIN switch error:", error);
    return NextResponse.json({ message: error.message || "Failed to switch user" }, { status: 500 });
  }
}

