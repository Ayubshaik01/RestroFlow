import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  return NextResponse.json({
    id,
    title: "Food Safety & Health Inspection Certificate",
    category: "COMPLIANCE",
    expiresAt: new Date(Date.now() + 180 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    content: "Official certification copy on file in local storage.",
  });
}

export async function PATCH(req: Request) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  return NextResponse.json({ ok: true, ...body });
}

export async function DELETE() {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}

