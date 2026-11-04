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
  const rawToken = `rf_live_${crypto.randomBytes(24).toString("hex")}`;

  return NextResponse.json({
    id: `ikey-${Date.now()}`,
    name: body.name || "Integration Key",
    lastFour: rawToken.slice(-4),
    token: rawToken,
    branchId: body.branchId || null,
    scopes: body.scopes || ["ORDERS_READ", "ORDERS_WRITE"],
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    revokedAt: null,
  });
}

