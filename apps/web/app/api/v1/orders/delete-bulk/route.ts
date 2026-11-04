import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSessionUser } from "@/lib/auth/server-session";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const user = await getServerSessionUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { orderIds, password } = body;

    if (!Array.isArray(orderIds) || orderIds.length === 0 || !password) {
      return NextResponse.json({ message: "Order IDs and password required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Verify user password
    const { data: dbUser } = await admin
      .from("users")
      .select("password_hash")
      .eq("id", user.id)
      .single();

    if (!dbUser || !bcrypt.compareSync(password, dbUser.password_hash)) {
      return NextResponse.json({ message: "Incorrect password" }, { status: 403 });
    }

    const { error } = await admin
      .from("orders")
      .delete()
      .in("id", orderIds);

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json({ deleted: orderIds.length });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Failed to delete orders" }, { status: 500 });
  }
}

