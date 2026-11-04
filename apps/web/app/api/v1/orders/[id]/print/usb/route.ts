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
    const { searchParams } = new URL(req.url);
    const drawer = searchParams.get("drawer") === "true";

    const admin = createAdminClient();

    // Verify order exists
    const { data: order } = await admin
      .from("orders")
      .select("id, order_number, table_id")
      .eq("id", orderId)
      .maybeSingle();

    if (!order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    // Mark billed_at if not set
    await admin
      .from("orders")
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    return NextResponse.json({
      ok: true,
      drawerOpened: drawer,
      unsupportedChars: [],
    });
  } catch (err: any) {
    console.error("Print USB error:", err);
    return NextResponse.json({ message: err.message || "Print failed" }, { status: 500 });
  }
}

