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

const memoryInvoices: Map<string, VendorInvoice> = new Map([
  [
    "inv-1",
    {
      id: "inv-1",
      branchId: "demo-branch",
      invoiceNumber: "APX-88219",
      vendorName: "Apex Dairy & Cheese Co.",
      category: "Dairy & Frozen",
      issueDate: new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
      totalAmount: 640.0,
      paidAmount: 640.0,
      status: "PAID",
      notes: "Weekly butter, mozzarella, and whipping cream",
      createdAt: new Date().toISOString(),
    },
  ],
  [
    "inv-2",
    {
      id: "inv-2",
      branchId: "demo-branch",
      invoiceNumber: "SN-4410",
      vendorName: "Sunrise Organic Farms",
      category: "Fresh Produce",
      issueDate: new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
      totalAmount: 480.0,
      paidAmount: 0.0,
      status: "PENDING",
      notes: "Tomatoes, bell peppers, fresh herbs, lettuce",
      createdAt: new Date().toISOString(),
    },
  ],
  [
    "inv-3",
    {
      id: "inv-3",
      branchId: "demo-branch",
      invoiceNumber: "PKG-209",
      vendorName: "EcoPack Containers Ltd",
      category: "Packaging & Disposables",
      issueDate: new Date(Date.now() - 20 * 86400000).toISOString().slice(0, 10),
      dueDate: new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10),
      totalAmount: 350.0,
      paidAmount: 0.0,
      status: "OVERDUE",
      notes: "Takeout meal boxes and branded paper cups",
      createdAt: new Date().toISOString(),
    },
  ],
  [
    "inv-4",
    {
      id: "inv-4",
      branchId: "demo-branch",
      invoiceNumber: "PR-9011",
      vendorName: "Prime Cut Meats & Poultry",
      category: "Meat & Seafood",
      issueDate: new Date(Date.now() - 4 * 86400000).toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
      totalAmount: 890.0,
      paidAmount: 400.0,
      status: "PARTIAL",
      notes: "Chicken breast, beef patties, bacon",
      createdAt: new Date().toISOString(),
    },
  ],
  [
    "inv-5",
    {
      id: "inv-5",
      branchId: "demo-branch",
      invoiceNumber: "UTL-OCT",
      vendorName: "Metro Gas & Energy Supply",
      category: "Utilities",
      issueDate: new Date(Date.now() - 15 * 86400000).toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 1 * 86400000).toISOString().slice(0, 10),
      totalAmount: 280.0,
      paidAmount: 0.0,
      status: "PENDING",
      notes: "Commercial gas pipeline meter reading",
      createdAt: new Date().toISOString(),
    },
  ],
]);

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

