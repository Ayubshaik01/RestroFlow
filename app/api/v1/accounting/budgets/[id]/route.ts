import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/server-session";
import { removeBudget } from "../budget-store";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    await removeBudget(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "Failed to remove budget" }, { status: 500 });
  }
}

