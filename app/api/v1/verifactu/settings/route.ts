import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function GET() {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    enabled: false,
    environment: "TEST",
    seriesPrefix: "RF-2026",
    nextNumber: 1,
    hasCertificate: false,
    certSubject: null,
    certExpiresAt: null,
    problems: [],
    counts: {},
    status: "implemented-not-certified",
  });
}

export async function PUT(req: Request) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  return NextResponse.json({
    enabled: Boolean(body.enabled),
    environment: body.environment || "TEST",
    seriesPrefix: body.seriesPrefix || "RF-2026",
    nextNumber: body.nextNumber || 1,
    hasCertificate: false,
    certSubject: null,
    certExpiresAt: null,
    problems: [],
    counts: {},
    status: "implemented-not-certified",
  });
}

