import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/server-session";
import { autoMatchTransactions } from "../bank-store";

export async function POST(req: Request) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId") || "demo-branch";

  const matched = await autoMatchTransactions(branchId);
  return NextResponse.json({ matched });
}

