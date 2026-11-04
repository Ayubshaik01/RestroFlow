import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function GET(req: Request) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: users } = await admin
    .from("users")
    .select("id, name");

  const rows = (users || []).map((u: any) => ({
    userId: u.id,
    name: u.name,
    payType: "MONTHLY",
    rate: 3500,
  }));

  return NextResponse.json(rows);
}

