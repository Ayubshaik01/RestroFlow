import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/server-session";
import { generateReportData } from "../report-service";
import { REPORT_CATALOG } from "../catalog";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  try {
    const user = await getServerSessionUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { key } = await params;
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId") || "demo-branch";
    const fromStr = searchParams.get("from") || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const toStr = searchParams.get("to") || new Date().toISOString().slice(0, 10);

    const catalogEntry = REPORT_CATALOG.find((r) => r.key === key);
    if (!catalogEntry) {
      return NextResponse.json({ message: `Unknown report: ${key}` }, { status: 404 });
    }

    const report = await generateReportData(key, branchId, fromStr, toStr);
    if (!report) {
      return NextResponse.json({ message: "Report generation failed" }, { status: 500 });
    }

    return NextResponse.json(report);
  } catch (error: any) {
    console.error("Report execution error:", error);
    return NextResponse.json({ message: error.message || "Failed to generate report" }, { status: 500 });
  }
}
