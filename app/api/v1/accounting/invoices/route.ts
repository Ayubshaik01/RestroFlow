import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/server-session";

interface VendorInvoice {
  id: string;
  branchId: string;
  invoiceNumber: string;
  vendorName: string;
  category: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  status: "PENDING" | "PAID" | "PARTIAL" | "OVERDUE";
  notes?: string;
  createdAt: string;
}

const memoryInvoices: Map<string, VendorInvoice> = new Map();

export async function GET(req: Request) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId") || "demo-branch";
  const status = searchParams.get("status");

  let invoices = Array.from(memoryInvoices.values()).filter((i) => i.branchId === branchId);

  // Check and dynamically update overdue status
  const today = new Date().toISOString().slice(0, 10);
  invoices.forEach((inv) => {
    if (inv.status !== "PAID" && inv.dueDate < today) {
      inv.status = "OVERDUE";
    }
  });

  if (status && status !== "ALL") {
    invoices = invoices.filter((i) => i.status === status);
  }

  invoices.sort((a, b) => b.dueDate.localeCompare(a.dueDate));

  let totalPayable = 0;
  let totalOverdue = 0;
  let totalPaidThisMonth = 0;
  let pendingCount = 0;

  Array.from(memoryInvoices.values())
    .filter((i) => i.branchId === branchId)
    .forEach((inv) => {
      const remaining = inv.totalAmount - inv.paidAmount;
      if (remaining > 0) {
        totalPayable += remaining;
        pendingCount++;
        if (inv.dueDate < today) {
          totalOverdue += remaining;
        }
      }
      totalPaidThisMonth += inv.paidAmount;
    });

  return NextResponse.json({
    summary: {
      totalPayable: Math.round(totalPayable * 100) / 100,
      totalOverdue: Math.round(totalOverdue * 100) / 100,
      totalPaidThisMonth: Math.round(totalPaidThisMonth * 100) / 100,
      pendingCount,
      totalInvoices: memoryInvoices.size,
    },
    invoices,
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
    const { invoiceNumber, vendorName, category, issueDate, dueDate, totalAmount, notes } = body;

    if (!invoiceNumber || !vendorName || !totalAmount) {
      return NextResponse.json({ message: "Invoice number, vendor name, and total amount are required" }, { status: 400 });
    }

    const id = `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newInvoice: VendorInvoice = {
      id,
      branchId,
      invoiceNumber: invoiceNumber.trim(),
      vendorName: vendorName.trim(),
      category: category || "Supplies",
      issueDate: issueDate || new Date().toISOString().slice(0, 10),
      dueDate: dueDate || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      totalAmount: Number(totalAmount),
      paidAmount: 0,
      status: "PENDING",
      notes: notes || undefined,
      createdAt: new Date().toISOString(),
    };

    memoryInvoices.set(id, newInvoice);
    return NextResponse.json(newInvoice, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "Failed to create invoice" }, { status: 500 });
  }
}

