import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function POST() {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const secret = "JBSWY3DPEHPK3PXP";
  const emailOrName = (user as any).email || user.name;
  const otpauthUrl = `otpauth://totp/RestroFlow:${encodeURIComponent(emailOrName)}?secret=${secret}&issuer=RestroFlow`;

  return NextResponse.json({
    secret,
    otpauthUrl,
  });
}
