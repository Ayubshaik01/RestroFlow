import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/server-session";
import { updateBankTxStatus } from "../bank-store";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const { status } = await req.json();
    if (status !== "UNMATCHED" && status !== "IGNORED") {
      return NextResponse.json({ message: "Invalid status" }, { status: 400 });
    }

    const success = updateBankTxStatus(id, status);
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "Failed to update status" }, { status: 500 });
  }
}

