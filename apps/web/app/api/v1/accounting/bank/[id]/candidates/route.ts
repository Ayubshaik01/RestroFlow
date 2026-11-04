import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/server-session";
import { findCandidatesForBankTx } from "../../bank-store";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId") || "demo-branch";

  const candidates = await findCandidatesForBankTx(id, branchId);
  return NextResponse.json(candidates);
}

