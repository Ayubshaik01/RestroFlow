import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/server-session";
import { getComboComponentsFor, saveComboComponentsFor } from "@/lib/combos/combo-service";

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

  try {
    const components = await getComboComponentsFor(id, branchId);
    return NextResponse.json(components);
  } catch (error: any) {
    console.error("Failed to get combo components:", error);
    return NextResponse.json({ message: error.message || "Failed to load combo components" }, { status: 500 });
  }
}

export async function POST(
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

  try {
    const body = await req.json();
    const components = Array.isArray(body.components) ? body.components : [];

    const updated = await saveComboComponentsFor(id, branchId, components);
    return NextResponse.json(updated, { status: 200 });
  } catch (error: any) {
    console.error("Failed to save combo components:", error);
    return NextResponse.json({ message: error.message || "Failed to save combo components" }, { status: 500 });
  }
}

