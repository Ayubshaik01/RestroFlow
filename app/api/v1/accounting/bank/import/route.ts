import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/server-session";
import { parseBankCsv } from "../bank-store";

export async function POST(req: Request) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId") || "demo-branch";

  try {
    const { csv } = await req.json();
    if (!csv || typeof csv !== "string") {
      return NextResponse.json({ message: "Valid CSV text is required" }, { status: 400 });
    }

    const result = parseBankCsv(csv, branchId);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "Failed to import CSV" }, { status: 500 });
  }
}

