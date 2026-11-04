import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/server-session";
import { createSchedule, getSchedulesForBranch } from "./schedule-store";

export async function GET(req: Request) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId") || "demo-branch";

  const emailConfigured = Boolean(process.env.SMTP_URL || process.env.SMTP_HOST || process.env.RESEND_API_KEY);
  const schedules = await getSchedulesForBranch(branchId);

  return NextResponse.json({
    emailConfigured,
    schedules,
  });
}

export async function POST(req: Request) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId") || "demo-branch";

  try {
    const body = await req.json();
    const { reportKey, frequency, format, recipients } = body;

    if (!reportKey || !recipients || !recipients.length) {
      return NextResponse.json({ message: "Report key and at least one recipient are required" }, { status: 400 });
    }

    const created = await createSchedule({
      branchId,
      reportKey,
      frequency: frequency || "WEEKLY",
      format: format || "xlsx",
      recipients: Array.isArray(recipients) ? recipients : [recipients],
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "Failed to create schedule" }, { status: 500 });
  }
}

