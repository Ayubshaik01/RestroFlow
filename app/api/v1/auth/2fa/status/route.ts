import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function GET() {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    enabled: false,
    recoveryCodesLeft: 0,
  });
}

