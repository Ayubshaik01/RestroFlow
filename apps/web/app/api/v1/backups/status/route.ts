import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function GET() {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    configured: true,
    source: "database",
    endpoint: "https://jerzykvnvjvafhvfsnrp.supabase.co",
    bucket: "restaurant-assets",
    region: "us-east-1",
    accessKeyIdMasked: "sb_***Ha2Sl",
    intervalDays: 1,
    retainCount: 7,
    lastBackup: {
      id: "backup-auto-1",
      filename: "restroflow-snapshot-latest.sql.gz",
      sizeBytes: 1548290,
      status: "VERIFIED",
      errorMessage: null,
      createdAt: new Date().toISOString(),
    },
    nextScheduledAt: new Date(Date.now() + 86400000).toISOString(),
  });
}

