import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function GET() {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json([
    {
      id: "doc-health-cert",
      title: "Food Safety & Health Inspection Certificate",
      category: "COMPLIANCE",
      expiresAt: new Date(Date.now() + 180 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "doc-fire-safety",
      title: "Fire Safety & Extinguisher Inspection",
      category: "SAFETY",
      expiresAt: new Date(Date.now() + 90 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);
}

export async function POST(req: Request) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  return NextResponse.json({
    id: `doc-${Date.now()}`,
    title: body.title || "Untitled Document",
    category: body.category || "GENERAL",
    expiresAt: body.expiresAt || null,
    updatedAt: new Date().toISOString(),
  });
}

