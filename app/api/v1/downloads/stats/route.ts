import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json([
    { channel: "docker", count: 850 },
    { channel: "install-script", count: 2420 },
    { channel: "github", count: 1680 },
    { channel: "casaos", count: 540 },
  ]);
}

