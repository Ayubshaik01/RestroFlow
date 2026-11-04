import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const admin = createAdminClient();
    const { count, error } = await admin
      .from("restaurants")
      .select("id", { count: "exact", head: true });

    if (error) {
      return NextResponse.json({ isSetup: true });
    }

    return NextResponse.json({ isSetup: (count ?? 0) > 0 });
  } catch {
    return NextResponse.json({ isSetup: true });
  }
}

