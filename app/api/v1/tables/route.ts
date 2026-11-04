import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function POST(req: Request) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const admin = createAdminClient();

  const { data: table, error } = await admin
    .from("tables")
    .insert({
      floor_id: body.floorId,
      number: body.number,
      name: body.name || `Table ${body.number}`,
      capacity: body.capacity || 4,
      shape: body.shape || "square",
      pos_x: body.posX || 0,
      pos_y: body.posY || 0,
      width: body.width || 80,
      height: body.height || 80,
      rotation: body.rotation || 0,
      qr_token: `qr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json(table);
}

