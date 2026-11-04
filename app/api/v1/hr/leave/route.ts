import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/server-session";

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
    id: `leave-${Date.now()}`,
    type: body.type || "ANNUAL",
    status: "PENDING",
    startDate: body.startDate,
    endDate: body.endDate,
    reason: body.reason || null,
    user: { id: user.id, name: user.name },
  });
}

