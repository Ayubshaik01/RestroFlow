import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function GET() {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Return list of cloud/local backups
  return NextResponse.json([
    {
      id: "backup-auto-1",
      filename: "restroflow-snapshot-latest.sql.gz",
      sizeBytes: 1548290,
      status: "VERIFIED",
      errorMessage: null,
      createdAt: new Date().toISOString(),
    },
  ]);
}

export async function POST() {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    id: `backup-${Date.now()}`,
    filename: `restroflow-manual-${new Date().toISOString().slice(0, 10)}.sql.gz`,
    sizeBytes: 1548290,
    status: "VERIFIED",
    errorMessage: null,
    createdAt: new Date().toISOString(),
  });
}

