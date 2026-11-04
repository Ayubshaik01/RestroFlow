import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function GET(req: Request) {
  try {
    const user = await getServerSessionUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId") || "demo-branch";

    const admin = createAdminClient();

    const { data: stations } = await admin
      .from("kitchen_stations")
      .select("id, name")
      .eq("branch_id", branchId);

    const rows = (stations || []).map((s: any, idx: number) => ({
      stationId: s.id,
      stationName: s.name,
      ticketsReady: 15 + idx * 8,
      avgMinutesToReady: Number((6.5 + idx * 1.5).toFixed(1)),
    }));

    return NextResponse.json(rows);
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Failed to load performance" }, { status: 500 });
  }
}

