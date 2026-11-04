import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function GET() {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    system: "RestroFlow Cloud POS",
    version: "2.4.0",
  };

  return new NextResponse(JSON.stringify(exportPayload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="restroflow-export-${Date.now()}.json"`,
    },
  });
}

