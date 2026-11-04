import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function PATCH(req: Request) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const updates = await req.json();
  if (!Array.isArray(updates)) {
    return NextResponse.json({ message: "Expected array of updates" }, { status: 400 });
  }

  const admin = createAdminClient();

  for (const item of updates) {
    await admin
      .from("tables")
      .update({
        pos_x: item.posX,
        pos_y: item.posY,
        width: item.width,
        height: item.height,
        rotation: item.rotation,
        shape: item.shape,
      })
      .eq("id", item.id);
  }

  return NextResponse.json({ ok: true });
}

