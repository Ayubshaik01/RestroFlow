import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function GET() {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json([
    {
      id: "eq-fryer-1",
      name: "Double Basin Deep Fryer",
      category: "KITCHEN",
      serialNumber: "FRY-2024-884",
      status: "OPERATIONAL",
      lastServicedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      nextServiceAt: new Date(Date.now() + 60 * 86400000).toISOString(),
    },
    {
      id: "eq-pos-1",
      name: "POS Terminal 1 - Front Counter",
      category: "IT",
      serialNumber: "POS-2025-001",
      status: "OPERATIONAL",
      lastServicedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      nextServiceAt: new Date(Date.now() + 90 * 86400000).toISOString(),
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
    id: `eq-${Date.now()}`,
    name: body.name,
    category: body.category || "GENERAL",
    serialNumber: body.serialNumber || null,
    status: "OPERATIONAL",
    lastServicedAt: new Date().toISOString(),
    nextServiceAt: null,
  });
}

