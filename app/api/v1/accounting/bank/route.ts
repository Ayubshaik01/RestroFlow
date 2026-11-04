import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/server-session";
import { getBankView } from "./bank-store";

export async function GET(req: Request) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId") || "demo-branch";

  const bankView = await getBankView(branchId);
  return NextResponse.json(bankView);
}

