import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function POST(req: Request) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  return NextResponse.json({
    configured: true,
    source: "database",
    endpoint: body.endpoint,
    bucket: body.bucket,
    region: body.region || "us-east-1",
    accessKeyIdMasked: body.accessKeyId?.slice(0, 3) + "***",
    intervalDays: body.intervalDays || 1,
    retainCount: body.retainCount || 7,
    lastBackup: null,
    nextScheduledAt: new Date(Date.now() + 86400000).toISOString(),
  });
}

export async function DELETE() {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    configured: false,
    source: null,
    endpoint: null,
    bucket: null,
    region: null,
    accessKeyIdMasked: null,
    intervalDays: 1,
    retainCount: 7,
    lastBackup: null,
    nextScheduledAt: null,
  });
}

