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
    const reprint = searchParams.get("reprint") === "true";

    const admin = createAdminClient();

    // Fetch KOTs for this order
    const { data: kots, error } = await admin
      .from("kots")
      .select("id, kot_number, printed_count")
      .eq("order_id", orderId);

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    const printedList: { id: string; ticketNumber: string; reprint: number }[] = [];

    for (const kot of kots || []) {
      const currentCount = Number(kot.printed_count || 1);
      const newCount = reprint ? currentCount + 1 : currentCount;

      if (reprint) {
        await admin
          .from("kots")
          .update({ printed_count: newCount })
          .eq("id", kot.id);
      }

      printedList.push({
        id: kot.id,
        ticketNumber: kot.kot_number,
        reprint: reprint ? newCount : 0,
      });
    }

    return NextResponse.json({
      ok: true,
      printed: printedList,
      unsupportedChars: [],
    });
  } catch (err: any) {
    console.error("Print KOT error:", err);
    return NextResponse.json({ message: err.message || "Failed to print KOT" }, { status: 500 });
  }
}

