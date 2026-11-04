import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function GET() {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    currentVersion: "2.4.0",
    latestVersion: "2.4.0",
    updateAvailable: false,
    building: false,
    releaseUrl: "https://github.com/restroflow/releases/latest",
    checkedAt: new Date().toISOString(),
  });
}

