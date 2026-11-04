import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function POST() {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    enabled: true,
    environment: "TEST",
    seriesPrefix: "RF-2026",
    nextNumber: 1,
    hasCertificate: true,
    certSubject: "CN=RestroFlow Tax Signer",
    certExpiresAt: new Date(Date.now() + 365 * 86400000).toISOString(),
    problems: [],
    counts: {},
    status: "implemented-not-certified",
  });
}

