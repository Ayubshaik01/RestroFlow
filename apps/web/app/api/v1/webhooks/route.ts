import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/server-session";
import crypto from "crypto";

export async function GET() {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json([]);
}

export async function POST(req: Request) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  return NextResponse.json({
    id: `wh_${Date.now()}`,
    url: body.url,
    events: body.events || [],
    description: body.description || null,
    isActive: true,
    secret: `whsec_${crypto.randomBytes(24).toString("hex")}`,
  });
}

