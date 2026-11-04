import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function POST() {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const recoveryCodes = [
    "A1B2-C3D4",
    "E5F6-G7H8",
    "I9J0-K1L2",
    "M3N4-O5P6",
    "Q7R8-S9T0",
  ];

  return NextResponse.json({ recoveryCodes });
}

