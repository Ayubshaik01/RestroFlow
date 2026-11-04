import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/server-session";
import { formatReportToCsv, formatReportToExcelXml, formatReportToHtml, generateReportData } from "../../report-service";
import { REPORT_CATALOG } from "../../route";

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
    const format = (searchParams.get("format") || "csv").toLowerCase();

    const catalogEntry = REPORT_CATALOG.find((r) => r.key === key);
    if (!catalogEntry) {
      return NextResponse.json({ message: `Unknown report: ${key}` }, { status: 404 });
    }

    const report = await generateReportData(key, branchId, fromStr, toStr);
    if (!report) {
      return NextResponse.json({ message: "Failed to compile report data" }, { status: 500 });
    }

    const baseName = `${key}_${fromStr}_to_${toStr}`;

    switch (format) {
      case "csv": {
        const csv = formatReportToCsv(report);
        return new NextResponse(csv, {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${baseName}.csv"`,
          },
        });
      }

      case "xlsx":
      case "excel": {
        const xml = formatReportToExcelXml(report, fromStr, toStr);
        return new NextResponse(xml, {
          status: 200,
          headers: {
            "Content-Type": "application/vnd.ms-excel; charset=utf-8",
            "Content-Disposition": `attachment; filename="${baseName}.xls"`,
          },
        });
      }

      case "pdf": {
        const html = formatReportToHtml(report, fromStr, toStr);
        return new NextResponse(html, {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Content-Disposition": `inline; filename="${baseName}.html"`,
          },
        });
      }

      default: {
        return NextResponse.json({ message: `Unsupported export format: ${format}` }, { status: 400 });
      }
    }
  } catch (error: any) {
    console.error("Report export error:", error);
    return NextResponse.json({ message: error.message || "Failed to export report" }, { status: 500 });
  }
}

