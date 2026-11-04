import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function GET() {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json([
    "order.created",
    "order.status_changed",
    "order.billed",
    "order.cancelled",
    "kot.created",
    "kot.status_changed",
    "table.status_changed",
    "inventory.low_stock",
    "payment.completed",
  ]);
}

