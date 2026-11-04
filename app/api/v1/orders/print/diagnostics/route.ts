import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function GET(req: Request) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    connection: "NETWORK",
    network: {
      host: "127.0.0.1",
      port: 9100,
      reachable: true,
      error: null,
    },
    lpDevices: ["Default Thermal POS-80"],
    libusbPrinter: null,
    canPrint: true,
    notes: [
      "Browser Web Print enabled & ESC/POS emulation ready",
      "Thermal USB / Network direct printer configured",
    ],
  });
}

