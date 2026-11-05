import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/server-session";
import { REPORT_CATALOG } from "./catalog";

export async function GET() {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(REPORT_CATALOG);
}
