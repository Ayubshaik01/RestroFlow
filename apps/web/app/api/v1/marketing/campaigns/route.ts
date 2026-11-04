import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function GET() {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json([
    {
      id: "camp-welcome",
      name: "VIP Welcome Discount",
      channel: "WHATSAPP",
      segment: "LOYAL",
      message: "Hi there! Enjoy 15% off your next visit at RestroFlow.",
      lastSentAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      lastSentCount: 148,
    },
  ]);
}

export async function POST(req: Request) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  return NextResponse.json({
    id: `camp-${Date.now()}`,
    name: body.name,
    channel: body.channel || "SMS",
    segment: body.segment || "ALL",
    message: body.message || "",
    lastSentAt: null,
    lastSentCount: 0,
  });
}

