import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSessionUser } from "@/lib/auth/server-session";
import bcrypt from "bcryptjs";

export async function GET() {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: users } = await admin
    .from("users")
    .select(
      `
      id,
      name,
      email,
      phone,
      is_active,
      created_at,
      role_id,
      roles:role_id (id, name, label),
      user_branches (
        branches:branch_id (id, name)
      )
    `,
    )
    .eq("restaurant_id", user.restaurantId)
    .order("name", { ascending: true });

  const formatted = (users || []).map((u: any) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    isActive: u.is_active,
    createdAt: u.created_at,
    roleId: u.role_id,
    role: u.roles || { id: u.role_id, name: "STAFF", label: "Staff" },
    branches: (u.user_branches || []).map((ub: any) => ({
      branch: ub.branches || { id: "demo-branch", name: "Main Branch" },
    })),
  }));

  return NextResponse.json(formatted);
}

export async function POST(req: Request) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const admin = createAdminClient();

  const passwordHash = body.password ? await bcrypt.hash(body.password, 10) : null;
  const pinHash = body.pin ? await bcrypt.hash(body.pin, 10) : null;

  const { data: newUser, error } = await admin
    .from("users")
    .insert({
      restaurant_id: user.restaurantId,
      role_id: body.roleId,
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
      password_hash: passwordHash,
      pin_hash: pinHash,
      is_active: true,
    })
    .select("id, name, email, phone, is_active, created_at, role_id")
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  // Link to branches
  if (Array.isArray(body.branchIds)) {
    for (const bId of body.branchIds) {
      await admin.from("user_branches").insert({
        user_id: newUser.id,
        branch_id: bId,
      });
    }
  }

  return NextResponse.json(newUser);
}

