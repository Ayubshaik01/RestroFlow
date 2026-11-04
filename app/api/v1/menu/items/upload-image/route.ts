import { NextResponse } from "next/server";
import { uploadAsset, ensureStorageBucket } from "@/lib/supabase/storage";
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
    const filename = `menu/${user.restaurantId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const url = await uploadAsset(filename, buffer, file.type || "image/png");

    return NextResponse.json({ url });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to upload image" },
      { status: 500 },
    );
  }
}

