import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSessionUser } from "@/lib/auth/server-session";
import crypto from "crypto";

export async function POST(req: Request) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { floorId, numbers, capacity = 2, shape = "square", color } = body;

  if (!floorId || !Array.isArray(numbers) || numbers.length === 0) {
    return NextResponse.json(
      { message: "floorId and numbers array are required" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const rows = numbers.map((num: string, idx: number) => {
    const col = idx % 4;
    const row = Math.floor(idx / 4);
    return {
      floor_id: floorId,
      number: String(num),
      name: `Table ${num}`,
      capacity: Number(capacity) || 2,
      shape: shape || "square",
      color: color || null,
      status: "AVAILABLE",
      pos_x: 40 + col * 120,
      pos_y: 40 + row * 120,
      width: shape === "rect" ? 120 : 80,
      height: 80,
      qr_token: crypto.randomBytes(16).toString("hex"),
    };
  });

  const { data, error } = await admin.from("tables").insert(rows).select();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}

