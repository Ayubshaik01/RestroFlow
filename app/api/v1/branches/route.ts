import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function GET() {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: branches, error } = await admin
    .from("branches")
    .select("id, name, address, phone, gst_number, country, tax_regime, tax_mode, tax_label, is_active")
    .eq("restaurant_id", user.restaurantId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error || !branches || branches.length === 0) {
    // Demo fallback branch
    return NextResponse.json([
      {
        id: "demo-branch",
        name: "Main Branch",
        address: "123 MG Road, Bengaluru",
        phone: "+91 98765 43210",
        gstNumber: "29AAAAA0000A1Z5",
        country: "IN",
        taxRegime: "INDIA_GST",
        taxMode: "INCLUSIVE",
        taxLabel: "GST",
      },
    ]);
  }

  return NextResponse.json(branches);
}

