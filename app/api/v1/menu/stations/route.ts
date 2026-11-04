import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function GET(req: Request) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId") || "demo-branch";
  const admin = createAdminClient();

  const { data: stations, error } = await admin
    .from("kitchen_stations")
    .select("id, name, printer_name")
    .eq("branch_id", branchId);

  if (error || !stations || stations.length === 0) {
    return NextResponse.json([
      { id: "station-main", name: "Main Kitchen" },
      { id: "station-bar", name: "Beverage Bar" },
    ]);
  }

  return NextResponse.json(stations);
}

