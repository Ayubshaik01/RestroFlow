import { NextResponse } from "next/server";
import { uploadAsset, ensureStorageBucket } from "@/lib/supabase/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function POST(req: Request) {
  try {
    const user = await getServerSessionUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ message: "No file uploaded" }, { status: 400 });
    }

    await ensureStorageBucket();

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() || "png";
    const filename = `logos/${user.restaurantId}-${Date.now()}.${ext}`;

    const url = await uploadAsset(filename, buffer, file.type || "image/png");

    const admin = createAdminClient();
    await admin
      .from("restaurants")
      .update({ logo_url: url, updated_at: new Date().toISOString() })
      .eq("id", user.restaurantId);

    return NextResponse.json({ url });
  } catch (error: any) {
    console.error("Upload logo error:", error);
    return NextResponse.json({ message: error.message || "Failed to upload logo" }, { status: 500 });
  }
}

