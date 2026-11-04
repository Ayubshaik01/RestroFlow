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

  const { data: requests, error } = await admin
    .from("table_requests")
    .select(
      `
      id,
      type,
      created_at,
      tables:table_id (id, number, name)
    `
    )
    .eq("branch_id", branchId)
    .eq("status", "PENDING")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json([]);
  }

  const formatted = (requests || []).map((r: any) => ({
    id: r.id,
    type: r.type,
    createdAt: r.created_at,
    table: r.tables || { id: "unknown", number: "1", name: "Table 1" },
  }));

  return NextResponse.json(formatted);
}

export async function POST(req: Request) {
  const body = await req.json();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("table_requests")
    .insert({
      branch_id: body.branchId || "demo-branch",
      table_id: body.tableId,
      type: body.type || "WAITER",
      notes: body.notes || null,
      status: "PENDING",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}

