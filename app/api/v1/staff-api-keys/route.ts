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
  const rawToken = `rf_staff_${crypto.randomBytes(24).toString("hex")}`;

  return NextResponse.json({
    id: `key-${Date.now()}`,
    name: body.name || "Staff API Key",
    lastFour: rawToken.slice(-4),
    token: rawToken,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    revokedAt: null,
  });
}

