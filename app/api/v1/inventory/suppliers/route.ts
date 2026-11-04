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

  const { data: suppliers } = await admin
    .from("suppliers")
    .select("*")
    .eq("branch_id", branchId)
    .order("name", { ascending: true });

  return NextResponse.json(suppliers || []);
}

export async function POST(req: Request) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId") || "demo-branch";
  const body = await req.json();

  const admin = createAdminClient();
  const { data: supplier, error } = await admin
    .from("suppliers")
    .insert({
      branch_id: branchId,
      name: body.name,
      contact_name: body.contactName || null,
      phone: body.phone || null,
      email: body.email || null,
      address: body.address || null,
      gst_number: body.gstNumber || null,
      notes: body.notes || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json(supplier);
}

