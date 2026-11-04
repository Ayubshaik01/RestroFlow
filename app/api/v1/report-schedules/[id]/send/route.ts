import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/server-session";
import { markScheduleSent } from "../../schedule-store";
import { generateReportData } from "../../../reports/report-service";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId") || "demo-branch";

  try {
    const toStr = new Date().toISOString().slice(0, 10);
    const fromStr = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

    // Verify report compiles
    const report = await generateReportData("sales-daily", branchId, fromStr, toStr);
    if (!report) {
      await markScheduleSent(id, "Could not generate report data");
      return NextResponse.json({ message: "Failed to compile report" }, { status: 500 });
    }

    await markScheduleSent(id);
    return NextResponse.json({ success: true, message: "Report generated and dispatched" });
  } catch (error: any) {
    await markScheduleSent(id, error.message);
    return NextResponse.json({ message: error.message || "Failed to send report" }, { status: 500 });
  }
}

