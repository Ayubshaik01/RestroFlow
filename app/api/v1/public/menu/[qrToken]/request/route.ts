import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ qrToken: string }> },
) {
  try {
    const { qrToken } = await params;
    const { type } = await req.json();
    const admin = createAdminClient();

    const { data: table } = await admin
      .from("tables")
      .select("id, number, floors!inner(branch_id)")
      .eq("qr_token", qrToken)
      .maybeSingle();

    if (!table) {
      return NextResponse.json({ message: "Table not found" }, { status: 404 });
    }

    const floorData: any = table.floors;
    const branchId = floorData.branch_id;

    // Insert table request
    await admin.from("table_requests").insert({
      table_id: table.id,
      branch_id: branchId,
      type: type || "waiter",
      status: "PENDING",
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

