import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { SESSION_COOKIE_NAME } from "@/lib/auth/server-session";
import type { SessionUser } from "@/types/auth";

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("restaurants")
      .select("allow_public_signup")
      .eq("allow_public_signup", true)
      .limit(1);

    const isAllowed = Boolean(data && data.length > 0);
    return NextResponse.json({ allowPublicSignup: isAllowed });
  } catch {
    return NextResponse.json({ allowPublicSignup: false });
  }
}

export async function POST(req: Request) {
  try {
    const admin = createAdminClient();

    // Enforce tight security: Check if public signup is permitted by the owner
    const { data: enabledConfigs } = await admin
      .from("restaurants")
      .select("allow_public_signup")
      .eq("allow_public_signup", true)
      .limit(1);

    const isAllowed = Boolean(enabledConfigs && enabledConfigs.length > 0);

    if (!isAllowed) {
      return NextResponse.json(
        {
          message:
            "Public account registration is disabled. Accounts can only be created by an Owner or Administrator from Settings > Staff.",
          code: "REGISTRATION_DISABLED",
        },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { restaurantName, branchName = "Main Branch", ownerName, email, password } = body;

    if (!restaurantName || !ownerName || !email || !password) {
      return NextResponse.json(
        { message: "All registration fields are required" },
        { status: 400 },
      );
    }

    // 1. Create Restaurant
    const { data: restaurant, error: restError } = await admin
      .from("restaurants")
      .insert({
        name: restaurantName,
        currency: "INR",
        timezone: "Asia/Kolkata",
        allow_public_signup: false, // New instances start tight by default
      })
      .select("id, name")
      .single();

    if (restError || !restaurant) {
      throw new Error(restError?.message || "Failed to create restaurant");
    }

    // 2. Create Branch
    const { data: branch, error: branchError } = await admin
      .from("branches")
      .insert({
        restaurant_id: restaurant.id,
        name: branchName,
      })
      .select("id, name")
      .single();

    if (branchError || !branch) {
      throw new Error(branchError?.message || "Failed to create branch");
    }

    // 3. Create default Owner Role
    const { data: role, error: roleError } = await admin
      .from("roles")
      .insert({
        restaurant_id: restaurant.id,
        name: "OWNER",
        label: "Owner",
        is_system: true,
      })
      .select("id, name")
      .single();

    if (roleError || !role) {
      throw new Error(roleError?.message || "Failed to create owner role");
    }

    // 4. Create User
    const passwordHash = await bcrypt.hash(password, 10);
    const pinHash = await bcrypt.hash("1111", 10);

    const { data: newUser, error: userError } = await admin
      .from("users")
      .insert({
        restaurant_id: restaurant.id,
        role_id: role.id,
        name: ownerName,
        email,
        password_hash: passwordHash,
        pin_hash: pinHash,
        is_active: true,
      })
      .select("id, name, restaurant_id, role_id")
      .single();

    if (userError || !newUser) {
      throw new Error(userError?.message || "Failed to create user");
    }

    // Link user to branch
    await admin.from("user_branches").insert({
      user_id: newUser.id,
      branch_id: branch.id,
    });

    const sessionUser: SessionUser = {
      id: newUser.id,
      restaurantId: restaurant.id,
      name: newUser.name,
      roleId: role.id,
      roleName: "OWNER",
      permissions: ["*"],
    };

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, newUser.id, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });

    return NextResponse.json({ user: sessionUser });
  } catch (error: any) {
    console.error("Register error:", error);
    return NextResponse.json(
      { message: error.message || "Registration failed" },
      { status: 500 },
    );
  }
}
