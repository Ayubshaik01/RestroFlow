import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getServerSessionUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id: orderId } = await params;
    const body = await req.json();
    const amount = Number(body.amount);
    const method = body.method || "CASH";
    const reason = body.reason || "Refund issued";

    const admin = createAdminClient();

    // 1. Record negative payment
    await admin.from("payments").insert({
      order_id: orderId,
      method: method,
      amount: -Math.abs(amount),
      notes: reason,
    });

    // 2. Mark order as refunded
    await admin
      .from("orders")
      .update({
        status: "REFUNDED",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    return NextResponse.json({ ok: true, amountRefunded: amount });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Failed to process refund" }, { status: 500 });
  }
}

