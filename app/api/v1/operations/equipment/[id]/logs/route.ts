import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function POST(req: Request) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  return NextResponse.json({
    id: `log-${Date.now()}`,
    servicedAt: body.servicedAt || new Date().toISOString(),
    cost: body.cost || 0,
    note: body.note || null,
  });
}

