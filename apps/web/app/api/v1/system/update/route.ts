import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    currentVersion: "1.0.0",
    latestVersion: "1.0.0",
    updateAvailable: false,
  });
}

