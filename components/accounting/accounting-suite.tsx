"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  FileSpreadsheet,
  Filter,
  Layers,
  Plus,
  QrCode,
  Receipt,
  Search,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ApiError } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const err = (e: unknown) => (e instanceof ApiError ? e.message : "Something went wrong");

/* =========================================================================
   1. GENERAL LEDGER TAB
   ========================================================================= */

interface LedgerResponse {
  summary: {
    totalDebits: number;
    totalCredits: number;
    netDifference: number;
    isBalanced: boolean;
    totalEntries: number;
  };
  entries: {
    id: string;
    entryDate: string;
    accountName: string;
    accountType: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
    description: string;
    reference: string;
    debit: number;
    credit: number;
    balance: number;
  }[];
}

export function GeneralLedgerTab({ branchId }: { branchId: string | null }) {
  const qc = useQueryClient();
  const [from, setFrom] = useState(() => iso(new Date(Date.now() - 30 * 86400000)));
  const [to, setTo] = useState(() => iso(new Date()));
  const [accountType, setAccountType] = useState("ALL");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  // New Entry Form State
  const [entryDate, setEntryDate] = useState(() => iso(new Date()));
  const [accountName, setAccountName] = useState("1010 - Till & Drawer Cash");
  const [entryType, setEntryType] = useState<"ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE">("ASSET");
  const [desc, setDesc] = useState("");
  const [ref, setRef] = useState("");
  const [debit, setDebit] = useState("");
  const [credit, setCredit] = useState("");

  const qs = `branchId=${branchId}&from=${from}&to=${to}&accountType=${accountType}&search=${encodeURIComponent(search)}`;
  const { data, isLoading } = useQuery({
    queryKey: ["acct", "ledger", branchId, from, to, accountType, search],
    queryFn: () => api.get<LedgerResponse>(`/accounting/ledger?${qs}`),
    enabled: !!branchId,
  });

  const postEntry = useMutation({
    mutationFn: (body: any) => api.post(`/accounting/ledger?branchId=${branchId}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["acct", "ledger"] });
      toast.success("Journal entry recorded");
      setShowModal(false);
      setDesc("");
      setRef("");
      setDebit("");
      setCredit("");
    },
    onError: (e) => toast.error(err(e)),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dVal = parseFloat(debit) || 0;
    const cVal = parseFloat(credit) || 0;
    if (dVal <= 0 && cVal <= 0) {
      return toast.error("Please provide either a debit or credit amount");
    }
    postEntry.mutate({
      entryDate,
      accountName,
      accountType: entryType,
      description: desc.trim() || "Journal entry",
      reference: ref.trim() || undefined,
      debit: dVal,
      credit: cVal,
    });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground font-medium">Total Debits</p>
          <p className="text-xl font-bold tabular-nums text-foreground mt-1">
            {formatCurrency(data?.summary.totalDebits ?? 0)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground font-medium">Total Credits</p>
          <p className="text-xl font-bold tabular-nums text-foreground mt-1">
            {formatCurrency(data?.summary.totalCredits ?? 0)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground font-medium">Trial Balance</p>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full",
                data?.summary.isBalanced
                  ? "bg-emerald-500/10 text-emerald-600"
                  : "bg-amber-500/10 text-amber-600",
              )}
            >
              {data?.summary.isBalanced ? (
                <>
                  <CheckCircle2 className="h-3 w-3" /> Balanced
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3 w-3" /> Diff: {formatCurrency(data?.summary.netDifference ?? 0)}
                </>
              )}
            </span>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground font-medium">Journal Lines</p>
          <p className="text-xl font-bold tabular-nums text-foreground mt-1">
            {data?.summary.totalEntries ?? 0}
          </p>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <Input
              type="date"
              className="w-36 h-9"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              aria-label="From date"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="date"
              className="w-36 h-9"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              aria-label="To date"
            />
          </div>

          <select
            value={accountType}
            onChange={(e) => setAccountType(e.target.value)}
            className="h-9 rounded-lg border border-border bg-background px-2.5 text-xs font-medium"
            aria-label="Filter account type"
          >
            <option value="ALL">All Account Types</option>
            <option value="ASSET">Assets</option>
            <option value="LIABILITY">Liabilities</option>
            <option value="EQUITY">Equity</option>
            <option value="REVENUE">Revenue</option>
            <option value="EXPENSE">Expense</option>
          </select>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search memo or ref…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 w-44 text-xs"
            />
          </div>
        </div>

        <Button size="sm" onClick={() => setShowModal(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Post Journal Entry
        </Button>
      </Card>

      {/* Manual Entry Modal */}
      {showModal && (
        <Card className="p-5 border-primary/30 bg-card shadow-lg animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
            <div>
              <h3 className="font-semibold text-foreground text-sm">Record Journal Entry</h3>
              <p className="text-xs text-muted-foreground">Double-entry accounting adjustment</p>
            </div>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Date</label>
              <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} required />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Account</label>
              <Input
                placeholder="e.g. 1010 - Cash, 6010 - Rent"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Classification</label>
              <select
                value={entryType}
                onChange={(e) => setEntryType(e.target.value as any)}
                className="w-full h-9 rounded-lg border border-border bg-background px-2.5 text-sm"
              >
                <option value="ASSET">Asset</option>
                <option value="LIABILITY">Liability</option>
                <option value="EQUITY">Equity</option>
                <option value="REVENUE">Revenue</option>
                <option value="EXPENSE">Expense</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground block mb-1">Description / Memo</label>
              <Input
                placeholder="Details of the adjustment or transaction"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Reference / Doc #</label>
              <Input
                placeholder="e.g. ADJ-01, CHQ-449"
                value={ref}
                onChange={(e) => setRef(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Debit ($)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={debit}
                onChange={(e) => {
                  setDebit(e.target.value);
                  if (e.target.value) setCredit("");
                }}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Credit ($)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={credit}
                onChange={(e) => {
                  setCredit(e.target.value);
                  if (e.target.value) setDebit("");
                }}
              />
            </div>

            <div className="flex items-end">
              <Button type="submit" disabled={postEntry.isPending} className="w-full">
                Post to Ledger
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Ledger Table */}
      <Card className="overflow-x-auto p-4">
        {isLoading ? (
          <Skeleton className="h-32" />
        ) : data && data.entries.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-2 pr-4 font-semibold">Date</th>
                <th className="py-2 pr-4 font-semibold">Account</th>
                <th className="py-2 pr-4 font-semibold">Type</th>
                <th className="py-2 pr-4 font-semibold">Ref</th>
                <th className="py-2 pr-4 font-semibold">Description</th>
                <th className="py-2 pr-4 font-semibold text-right">Debit ($)</th>
                <th className="py-2 pr-4 font-semibold text-right">Credit ($)</th>
                <th className="py-2 text-right font-semibold">Net Balance ($)</th>
              </tr>
            </thead>
            <tbody>
              {data.entries.map((entry) => (
                <tr key={entry.id} className="border-t border-border hover:bg-muted/40 transition-colors">
                  <td className="py-2 pr-4 whitespace-nowrap text-xs text-muted-foreground">
                    {entry.entryDate}
                  </td>
                  <td className="py-2 pr-4 font-medium text-foreground text-xs whitespace-nowrap">
                    {entry.accountName}
                  </td>
                  <td className="py-2 pr-4">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                        entry.accountType === "ASSET" && "bg-sky-500/10 text-sky-600",
                        entry.accountType === "LIABILITY" && "bg-purple-500/10 text-purple-600",
                        entry.accountType === "EQUITY" && "bg-indigo-500/10 text-indigo-600",
                        entry.accountType === "REVENUE" && "bg-emerald-500/10 text-emerald-600",
                        entry.accountType === "EXPENSE" && "bg-rose-500/10 text-rose-600",
                      )}
                    >
                      {entry.accountType}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-xs font-mono text-muted-foreground">
                    {entry.reference}
                  </td>
                  <td className="py-2 pr-4 text-xs text-foreground max-w-xs truncate">
                    {entry.description}
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums text-xs">
                    {entry.debit > 0 ? formatCurrency(entry.debit) : "—"}
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums text-xs">
                    {entry.credit > 0 ? formatCurrency(entry.credit) : "—"}
                  </td>
                  <td className="py-2 text-right tabular-nums text-xs font-medium text-foreground">
                    {formatCurrency(entry.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No general ledger entries recorded in this range.
          </p>
        )}
      </Card>
    </div>
  );
}

/* =========================================================================
   2. VENDOR BILLS & ACCOUNTS PAYABLE TAB
   ========================================================================= */

interface InvoicesResponse {
  summary: {
    totalPayable: number;
    totalOverdue: number;
    totalPaidThisMonth: number;
    pendingCount: number;
    totalInvoices: number;
  };
  invoices: {
    id: string;
    invoiceNumber: string;
    vendorName: string;
    category: string;
    issueDate: string;
    dueDate: string;
    totalAmount: number;
    paidAmount: number;
    status: "PENDING" | "PAID" | "PARTIAL" | "OVERDUE";
    notes?: string;
  }[];
}

export function VendorBillsTab({ branchId }: { branchId: string | null }) {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showAddModal, setShowAddModal] = useState(false);

  // New Bill Form
  const [vendorName, setVendorName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [category, setCategory] = useState("Fresh Produce");
  const [issueDate, setIssueDate] = useState(() => iso(new Date()));
  const [dueDate, setDueDate] = useState(() => iso(new Date(Date.now() + 14 * 86400000)));
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const qs = `branchId=${branchId}&status=${statusFilter}`;
  const { data, isLoading } = useQuery({
    queryKey: ["acct", "invoices", branchId, statusFilter],
    queryFn: () => api.get<InvoicesResponse>(`/accounting/invoices?${qs}`),
    enabled: !!branchId,
  });

  const createInvoice = useMutation({
    mutationFn: (body: any) => api.post(`/accounting/invoices?branchId=${branchId}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["acct", "invoices"] });
      toast.success("Vendor bill recorded");
      setShowAddModal(false);
      setVendorName("");
      setInvoiceNumber("");
      setAmount("");
      setNotes("");
    },
    onError: (e) => toast.error(err(e)),
  });

  const markPaid = useMutation({
    mutationFn: ({ id, total }: { id: string; total: number }) =>
      api.patch(`/accounting/invoices/${id}?branchId=${branchId}`, {
        status: "PAID",
        paidAmount: total,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["acct", "invoices"] });
      toast.success("Bill marked as paid");
    },
    onError: (e) => toast.error(err(e)),
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!vendorName.trim() || !invoiceNumber.trim() || isNaN(amt) || amt <= 0) {
      return toast.error("Please fill in vendor name, invoice #, and valid amount");
    }
    createInvoice.mutate({
      vendorName,
      invoiceNumber,
      category,
      issueDate,
      dueDate,
      totalAmount: amt,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4 border-l-4 border-l-amber-500">
          <p className="text-xs text-muted-foreground font-medium">Total Accounts Payable</p>
          <p className="text-xl font-bold tabular-nums text-foreground mt-1">
            {formatCurrency(data?.summary.totalPayable ?? 0)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {data?.summary.pendingCount ?? 0} bills pending payment
          </p>
        </Card>

        <Card className="p-4 border-l-4 border-l-rose-500">
          <p className="text-xs text-muted-foreground font-medium">Overdue Liabilities</p>
          <p className="text-xl font-bold tabular-nums text-rose-600 mt-1">
            {formatCurrency(data?.summary.totalOverdue ?? 0)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Needs immediate settlement</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-500">
          <p className="text-xs text-muted-foreground font-medium">Disbursed This Month</p>
          <p className="text-xl font-bold tabular-nums text-emerald-600 mt-1">
            {formatCurrency(data?.summary.totalPaidThisMonth ?? 0)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Paid supplier invoices</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-sky-500">
          <p className="text-xs text-muted-foreground font-medium">Total Procurement Bills</p>
          <p className="text-xl font-bold tabular-nums text-foreground mt-1">
            {data?.summary.totalInvoices ?? 0}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Across active suppliers</p>
        </Card>
      </div>

      {/* Action Bar */}
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {(["ALL", "PENDING", "OVERDUE", "PARTIAL", "PAID"] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors capitalize",
                statusFilter === st
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/60 text-muted-foreground hover:bg-secondary",
              )}
            >
              {st.toLowerCase()}
            </button>
          ))}
        </div>

        <Button size="sm" onClick={() => setShowAddModal(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Record Vendor Bill
        </Button>
      </Card>

      {/* Modal to add vendor bill */}
      {showAddModal && (
        <Card className="p-5 border-primary/30 bg-card shadow-lg animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
            <div>
              <h3 className="font-semibold text-foreground text-sm">New Vendor Invoice</h3>
              <p className="text-xs text-muted-foreground">Enter procurement invoice details</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleAddSubmit} className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Vendor Name</label>
              <Input
                placeholder="e.g. Apex Dairy, Farm Fresh"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Invoice Number</label>
              <Input
                placeholder="e.g. INV-9042"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-9 rounded-lg border border-border bg-background px-2.5 text-sm"
              >
                <option value="Fresh Produce">Fresh Produce</option>
                <option value="Dairy & Frozen">Dairy & Frozen</option>
                <option value="Meat & Seafood">Meat & Seafood</option>
                <option value="Packaging & Disposables">Packaging & Disposables</option>
                <option value="Utilities">Utilities</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Issue Date</label>
              <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} required />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Due Date</label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Total Bill Amount ($)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground block mb-1">Notes / Items Summary</label>
              <Input
                placeholder="e.g. 50kg Tomatoes, 20L Cream"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <Button type="submit" disabled={createInvoice.isPending} className="w-full">
                Save Invoice
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Invoices List Table */}
      <Card className="overflow-x-auto p-4">
        {isLoading ? (
          <Skeleton className="h-32" />
        ) : data && data.invoices.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-2 pr-4 font-semibold">Bill #</th>
                <th className="py-2 pr-4 font-semibold">Vendor</th>
                <th className="py-2 pr-4 font-semibold">Category</th>
                <th className="py-2 pr-4 font-semibold">Issue Date</th>
                <th className="py-2 pr-4 font-semibold">Due Date</th>
                <th className="py-2 pr-4 font-semibold text-right">Amount ($)</th>
                <th className="py-2 pr-4 font-semibold text-right">Paid ($)</th>
                <th className="py-2 pr-4 font-semibold">Status</th>
                <th className="py-2 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.invoices.map((inv) => (
                <tr key={inv.id} className="border-t border-border hover:bg-muted/40 transition-colors">
                  <td className="py-2.5 pr-4 font-mono font-medium text-xs text-foreground">
                    {inv.invoiceNumber}
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className="font-semibold text-foreground text-xs block">{inv.vendorName}</span>
                    {inv.notes && <span className="text-[11px] text-muted-foreground">{inv.notes}</span>}
                  </td>
                  <td className="py-2.5 pr-4 text-xs text-muted-foreground whitespace-nowrap">
                    {inv.category}
                  </td>
                  <td className="py-2.5 pr-4 text-xs text-muted-foreground whitespace-nowrap">
                    {inv.issueDate}
                  </td>
                  <td className="py-2.5 pr-4 text-xs whitespace-nowrap">
                    <span
                      className={cn(
                        inv.status === "OVERDUE" && "font-semibold text-rose-600",
                        inv.status === "PENDING" && "text-foreground",
                      )}
                    >
                      {inv.dueDate}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-xs font-semibold text-foreground">
                    {formatCurrency(inv.totalAmount)}
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-xs text-muted-foreground">
                    {formatCurrency(inv.paidAmount)}
                  </td>
                  <td className="py-2.5 pr-4">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                        inv.status === "PAID" && "bg-emerald-500/10 text-emerald-600",
                        inv.status === "PENDING" && "bg-amber-500/10 text-amber-600",
                        inv.status === "OVERDUE" && "bg-rose-500/10 text-rose-600",
                        inv.status === "PARTIAL" && "bg-sky-500/10 text-sky-600",
                      )}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-2.5 text-right whitespace-nowrap">
                    {inv.status !== "PAID" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => markPaid.mutate({ id: inv.id, total: inv.totalAmount })}
                        disabled={markPaid.isPending}
                      >
                        Mark Paid
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No vendor bills found matching this filter.
          </p>
        )}
      </Card>
    </div>
  );
}

/* =========================================================================
   3. CASH FLOW STATEMENT TAB
   ========================================================================= */

interface PaymentBreakdown {
  method: "CASH" | "UPI" | "BANK_CARD" | "OTHERS";
  label: string;
  amount: number;
  count: number;
  percentage: number;
}

interface CashFlowPeriodData {
  period: "day" | "month" | "year" | "custom";
  periodLabel: string;
  from: string;
  to: string;
  totalInflow: number;
  totalOutflow: number;
  netCashFlow: number;
  receiptsCount: number;
  distribution: {
    cash: PaymentBreakdown;
    upi: PaymentBreakdown;
    bank: PaymentBreakdown;
    others: PaymentBreakdown;
  };
  expenses: {
    total: number;
    cashExpenses: number;
    bankExpenses: number;
    count: number;
  };
  receipts: Array<{
    id: string;
    orderNumber: string;
    paidAt: string;
    method: "CASH" | "UPI" | "BANK_CARD" | "OTHERS";
    rawMethod: string;
    amount: number;
    status: string;
    orderType: string;
  }>;
}

interface CashFlowResponse {
  day: CashFlowPeriodData;
  month: CashFlowPeriodData;
  year: CashFlowPeriodData;
  custom?: CashFlowPeriodData | null;
  summary: {
    todayRevenue: number;
    todayCashInHand: number;
    monthRevenue: number;
    yearRevenue: number;
    totalReceiptsCount: number;
  };
  operating?: {
    inflows: { label: string; amount: number }[];
    outflows: { label: string; amount: number }[];
    net: number;
  };
  summaryLegacy?: {
    openingBalance: number;
    netCashChange: number;
    closingBalance: number;
  };
  metrics?: {
    runwayDays: number;
    dailyBurn: number;
    operatingRatio: number;
  };
}

export function CashFlowTab({ branchId }: { branchId: string | null }) {
  const [periodMode, setPeriodMode] = useState<"day" | "month" | "year" | "custom">("day");
  const [methodFilter, setMethodFilter] = useState<"ALL" | "CASH" | "UPI" | "BANK_CARD" | "OTHERS">("ALL");
  const [receiptSearch, setReceiptSearch] = useState("");
  const [showFormalStatement, setShowFormalStatement] = useState(false);

  const [customFrom, setCustomFrom] = useState(() => iso(new Date(Date.now() - 30 * 86400000)));
  const [customTo, setCustomTo] = useState(() => iso(new Date()));

  const qs = `branchId=${branchId}${periodMode === "custom" ? `&from=${customFrom}&to=${customTo}` : ""}`;
  const { data, isLoading } = useQuery({
    queryKey: ["acct", "cash-flow", branchId, periodMode === "custom" ? `${customFrom}-${customTo}` : "standard"],
    queryFn: () => api.get<CashFlowResponse>(`/accounting/cash-flow?${qs}`),
    enabled: !!branchId,
  });

  const activeData: CashFlowPeriodData | undefined = data
    ? periodMode === "day"
      ? data.day
      : periodMode === "month"
      ? data.month
      : periodMode === "year"
      ? data.year
      : data.custom || data.month
    : undefined;

  // Filter receipts
  const filteredReceipts = (activeData?.receipts || []).filter((r) => {
    if (methodFilter !== "ALL" && r.method !== methodFilter) return false;
    if (receiptSearch) {
      const q = receiptSearch.toLowerCase();
      return (
        r.orderNumber.toLowerCase().includes(q) ||
        String(r.amount).includes(q) ||
        r.rawMethod.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const exportReceiptsCsv = () => {
    if (!activeData || activeData.receipts.length === 0) {
      toast.error("No receipts to export");
      return;
    }
    const headers = ["Order Number", "Date & Time", "Payment Category", "Raw Method", "Amount", "Status", "Order Type"];
    const rows = activeData.receipts.map((r) => [
      r.orderNumber,
      new Date(r.paidAt).toLocaleString(),
      r.method,
      r.rawMethod,
      r.amount.toFixed(2),
      r.status,
      r.orderType,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `CashFlow_${activeData.period}_${activeData.from}_to_${activeData.to}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Receipts export downloaded successfully");
  };

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Header & Period Selector (Day / Month / Year / Custom) */}
      <Card className="p-4 bg-card border-border/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-foreground">Cash Flow &amp; Payment Settlements</h2>
            <span className="text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              100% Real User Receipts
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time liquid distribution across Drawer Cash, UPI, and Bank settlements
          </p>
        </div>

        {/* Quick Period Buttons: Day, Month, Year, Custom */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => setPeriodMode("day")}
              className={cn(
                "px-3 py-1 text-xs font-semibold rounded-md transition-all",
                periodMode === "day"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              ☀️ Today (Day)
            </button>
            <button
              type="button"
              onClick={() => setPeriodMode("month")}
              className={cn(
                "px-3 py-1 text-xs font-semibold rounded-md transition-all",
                periodMode === "month"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              📅 This Month
            </button>
            <button
              type="button"
              onClick={() => setPeriodMode("year")}
              className={cn(
                "px-3 py-1 text-xs font-semibold rounded-md transition-all",
                periodMode === "year"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              📈 This Year
            </button>
            <button
              type="button"
              onClick={() => setPeriodMode("custom")}
              className={cn(
                "px-3 py-1 text-xs font-semibold rounded-md transition-all",
                periodMode === "custom"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              🗓️ Custom Range
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFormalStatement(!showFormalStatement)}
            className="text-xs h-8"
          >
            {showFormalStatement ? "Show Payment Breakdown" : "CFO Statement"}
          </Button>
        </div>
      </Card>

      {/* Custom Date Range Picker when selected */}
      {periodMode === "custom" && (
        <Card className="flex items-center gap-3 p-3 bg-muted/30">
          <span className="text-xs font-medium text-foreground">Custom Date Filter:</span>
          <Input
            type="date"
            className="w-36 h-8 text-xs"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            className="w-36 h-8 text-xs"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
          />
        </Card>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : activeData ? (
        <>
          {/* 2. Top Inflow, Outflow, Net In-Hand KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="p-4 border-l-4 border-l-emerald-500 bg-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Total Collections (Inflow)
                </span>
                <ArrowUpRight className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold tabular-nums text-foreground mt-1.5">
                +{formatCurrency(activeData.totalInflow)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                From {activeData.receiptsCount} real customer receipts ({activeData.periodLabel})
              </p>
            </Card>

            <Card className="p-4 border-l-4 border-l-rose-500 bg-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Total Expenses (Outflow)
                </span>
                <ArrowDownRight className="h-4 w-4 text-rose-600" />
              </div>
              <p className="text-2xl font-bold tabular-nums text-rose-600 mt-1.5">
                -{formatCurrency(activeData.totalOutflow)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {formatCurrency(activeData.expenses.cashExpenses)} cash + {formatCurrency(activeData.expenses.bankExpenses)} bank
              </p>
            </Card>

            <Card
              className={cn(
                "p-4 border-l-4",
                activeData.netCashFlow >= 0 ? "border-l-primary bg-primary/5" : "border-l-rose-500 bg-rose-500/5",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Net Liquid Cash Flow
                </span>
                <Wallet className="h-4 w-4 text-primary" />
              </div>
              <p
                className={cn(
                  "text-2xl font-bold tabular-nums mt-1.5",
                  activeData.netCashFlow >= 0 ? "text-foreground" : "text-rose-600",
                )}
              >
                {activeData.netCashFlow >= 0 ? "+" : ""}
                {formatCurrency(activeData.netCashFlow)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Surplus generated in {activeData.periodLabel}
              </p>
            </Card>
          </div>

          {/* 3. The 4 Dedicated Payment Mode Distribution Cards: Bank, UPI, Cash, Others */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Distribution by Payment Mode ({activeData.periodLabel})
              </h3>
              <span className="text-xs text-muted-foreground">
                Sum: {formatCurrency(activeData.totalInflow)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Cash in Drawer */}
              <Card className="p-4 border-border/80 hover:border-emerald-500/50 transition-colors bg-card shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                      <Banknote className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">Cash in Drawer</p>
                      <p className="text-[10px] text-muted-foreground">Till &amp; Counter Float</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full">
                    {activeData.distribution.cash.percentage}%
                  </span>
                </div>
                <p className="text-xl font-bold tabular-nums text-foreground mt-2">
                  {formatCurrency(activeData.distribution.cash.amount)}
                </p>
                <div className="w-full bg-secondary h-1.5 rounded-full mt-2.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all"
                    style={{ width: `${activeData.distribution.cash.percentage}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-2 flex justify-between">
                  <span>Receipts Count:</span>
                  <strong className="text-foreground">{activeData.distribution.cash.count}</strong>
                </p>
              </Card>

              {/* UPI */}
              <Card className="p-4 border-border/80 hover:border-purple-500/50 transition-colors bg-card shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600">
                      <QrCode className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">UPI Direct</p>
                      <p className="text-[10px] text-muted-foreground">GPay / PhonePe / QR</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold bg-purple-500/10 text-purple-600 px-2 py-0.5 rounded-full">
                    {activeData.distribution.upi.percentage}%
                  </span>
                </div>
                <p className="text-xl font-bold tabular-nums text-foreground mt-2">
                  {formatCurrency(activeData.distribution.upi.amount)}
                </p>
                <div className="w-full bg-secondary h-1.5 rounded-full mt-2.5 overflow-hidden">
                  <div
                    className="bg-purple-500 h-full rounded-full transition-all"
                    style={{ width: `${activeData.distribution.upi.percentage}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-2 flex justify-between">
                  <span>Receipts Count:</span>
                  <strong className="text-foreground">{activeData.distribution.upi.count}</strong>
                </p>
              </Card>

              {/* Bank & Cards */}
              <Card className="p-4 border-border/80 hover:border-blue-500/50 transition-colors bg-card shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">Bank &amp; Cards</p>
                      <p className="text-[10px] text-muted-foreground">POS Swipe &amp; EDC</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full">
                    {activeData.distribution.bank.percentage}%
                  </span>
                </div>
                <p className="text-xl font-bold tabular-nums text-foreground mt-2">
                  {formatCurrency(activeData.distribution.bank.amount)}
                </p>
                <div className="w-full bg-secondary h-1.5 rounded-full mt-2.5 overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full transition-all"
                    style={{ width: `${activeData.distribution.bank.percentage}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-2 flex justify-between">
                  <span>Receipts Count:</span>
                  <strong className="text-foreground">{activeData.distribution.bank.count}</strong>
                </p>
              </Card>

              {/* Others */}
              <Card className="p-4 border-border/80 hover:border-amber-500/50 transition-colors bg-card shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                      <Layers className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">Other Receipts</p>
                      <p className="text-[10px] text-muted-foreground">Aggregators / Gift Card</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full">
                    {activeData.distribution.others.percentage}%
                  </span>
                </div>
                <p className="text-xl font-bold tabular-nums text-foreground mt-2">
                  {formatCurrency(activeData.distribution.others.amount)}
                </p>
                <div className="w-full bg-secondary h-1.5 rounded-full mt-2.5 overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all"
                    style={{ width: `${activeData.distribution.others.percentage}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-2 flex justify-between">
                  <span>Receipts Count:</span>
                  <strong className="text-foreground">{activeData.distribution.others.count}</strong>
                </p>
              </Card>
            </div>
          </div>

          {/* 4. Live Individual Customer Receipts & Settlements Table */}
          <Card className="p-4 bg-card shadow-sm border-border/80">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-bold text-sm text-foreground">
                  User Receipts &amp; Transactions ({activeData.periodLabel})
                </h3>
                <p className="text-xs text-muted-foreground">
                  Individual bills settled by customers with audit trails
                </p>
              </div>

              {/* Filters & Export */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-md border border-border bg-muted/40 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setMethodFilter("ALL")}
                    className={cn(
                      "px-2.5 py-1 rounded transition-colors",
                      methodFilter === "ALL" ? "bg-background font-semibold text-foreground" : "text-muted-foreground",
                    )}
                  >
                    All ({activeData.receipts.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethodFilter("CASH")}
                    className={cn(
                      "px-2.5 py-1 rounded transition-colors",
                      methodFilter === "CASH" ? "bg-background font-semibold text-emerald-600" : "text-muted-foreground",
                    )}
                  >
                    Cash ({activeData.distribution.cash.count})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethodFilter("UPI")}
                    className={cn(
                      "px-2.5 py-1 rounded transition-colors",
                      methodFilter === "UPI" ? "bg-background font-semibold text-purple-600" : "text-muted-foreground",
                    )}
                  >
                    UPI ({activeData.distribution.upi.count})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethodFilter("BANK_CARD")}
                    className={cn(
                      "px-2.5 py-1 rounded transition-colors",
                      methodFilter === "BANK_CARD" ? "bg-background font-semibold text-blue-600" : "text-muted-foreground",
                    )}
                  >
                    Bank/Card ({activeData.distribution.bank.count})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethodFilter("OTHERS")}
                    className={cn(
                      "px-2.5 py-1 rounded transition-colors",
                      methodFilter === "OTHERS" ? "bg-background font-semibold text-amber-600" : "text-muted-foreground",
                    )}
                  >
                    Others ({activeData.distribution.others.count})
                  </button>
                </div>

                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search receipt #…"
                    value={receiptSearch}
                    onChange={(e) => setReceiptSearch(e.target.value)}
                    className="pl-8 h-8 w-36 text-xs"
                  />
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={exportReceiptsCsv}
                  className="h-8 text-xs gap-1"
                >
                  <Download className="h-3.5 w-3.5" /> Export CSV
                </Button>
              </div>
            </div>

            {filteredReceipts.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground border border-dashed border-border/80 rounded-lg">
                <Receipt className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-xs font-semibold text-foreground">No customer receipts found</p>
                <p className="text-[11px] mt-0.5">
                  Orders completed at the POS counter will instantly appear here with their payment mode.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-left text-muted-foreground border-b border-border/60">
                    <tr>
                      <th className="py-2.5 pr-4 font-semibold">Time</th>
                      <th className="py-2.5 pr-4 font-semibold">Receipt / Order #</th>
                      <th className="py-2.5 pr-4 font-semibold">Type</th>
                      <th className="py-2.5 pr-4 font-semibold">Payment Mode</th>
                      <th className="py-2.5 pr-4 font-semibold">Status</th>
                      <th className="py-2.5 text-right font-semibold">Amount Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredReceipts.map((r) => (
                      <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 pr-4 whitespace-nowrap text-muted-foreground font-mono">
                          {new Date(r.paidAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="py-2.5 pr-4 whitespace-nowrap font-semibold text-foreground">
                          {r.orderNumber}
                        </td>
                        <td className="py-2.5 pr-4 whitespace-nowrap">
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-secondary text-secondary-foreground">
                            {r.orderType}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 whitespace-nowrap">
                          {r.method === "CASH" && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                              <Banknote className="h-3 w-3" /> Cash
                            </span>
                          )}
                          {r.method === "UPI" && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 bg-purple-500/10 px-2 py-0.5 rounded-full">
                              <QrCode className="h-3 w-3" /> UPI ({r.rawMethod})
                            </span>
                          )}
                          {r.method === "BANK_CARD" && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-full">
                              <CreditCard className="h-3 w-3" /> Card/Bank
                            </span>
                          )}
                          {r.method === "OTHERS" && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
                              <Layers className="h-3 w-3" /> {r.rawMethod}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 pr-4 whitespace-nowrap">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                            {r.status}
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-bold tabular-nums text-foreground">
                          {formatCurrency(r.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* 5. Optional Formal Corporate Cash Flow Statement (CFO View) */}
          {showFormalStatement && data?.operating ? (
            <Card className="p-5 bg-card border-border/80">
              <div className="flex items-center justify-between mb-3 border-b border-border pb-2">
                <div>
                  <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-600" /> Statutory Cash Flow Statement
                  </h3>
                  <p className="text-xs text-muted-foreground">Accounting view based on real operating inflows &amp; expenses</p>
                </div>
                <span
                  className={cn(
                    "font-bold tabular-nums text-sm",
                    data.operating.net >= 0 ? "text-emerald-600" : "text-rose-600",
                  )}
                >
                  Net Operating: {formatCurrency(data.operating.net)}
                </span>
              </div>

              <div className="flex flex-col divide-y divide-border text-xs">
                <p className="font-semibold text-muted-foreground uppercase pt-1 pb-1">Inflows</p>
                {data.operating.inflows.map((i) => (
                  <div key={i.label} className="flex justify-between py-1.5">
                    <span>{i.label}</span>
                    <span className="font-medium text-emerald-600 tabular-nums">+{formatCurrency(i.amount)}</span>
                  </div>
                ))}

                <p className="font-semibold text-muted-foreground uppercase pt-3 pb-1">Outflows</p>
                {data.operating.outflows.map((o) => (
                  <div key={o.label} className="flex justify-between py-1.5">
                    <span>{o.label}</span>
                    <span className="font-medium text-rose-600 tabular-nums">{formatCurrency(o.amount)}</span>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/* =========================================================================
   4. TAX AUDIT & COMPLIANCE HUB TAB
   ========================================================================= */

interface TaxAuditResponse {
  period: { from: string; to: string };
  outputTax: {
    totalTaxableSales: number;
    rates: { rate: string; tax: number }[];
    totalOutputTax: number;
  };
  inputTaxCredit: {
    supplies: number;
    packaging: number;
    capitalGoods: number;
    totalItc: number;
  };
  settlement: {
    grossLiability: number;
    itcUtilized: number;
    netPayable: number;
    dueDate: string;
    status: string;
  };
  hsnSummary: {
    code: string;
    description: string;
    rate: string;
    taxableValue: number;
    taxAmount: number;
  }[];
}

export function TaxAuditTab({ branchId }: { branchId: string | null }) {
  const [from, setFrom] = useState(() => iso(new Date(Date.now() - 30 * 86400000)));
  const [to, setTo] = useState(() => iso(new Date()));

  const qs = `branchId=${branchId}&from=${from}&to=${to}`;
  const { data, isLoading } = useQuery({
    queryKey: ["acct", "tax-audit", branchId, from, to],
    queryFn: () => api.get<TaxAuditResponse>(`/accounting/tax-audit?${qs}`),
    enabled: !!branchId,
  });

  return (
    <div className="flex flex-col gap-5">
      {/* Date Range Picker */}
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-2">
          <Input
            type="date"
            className="w-36 h-9"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            aria-label="Audit from date"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            className="w-36 h-9"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            aria-label="Audit to date"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600">
            <ShieldCheck className="h-3.5 w-3.5" /> Tax Filing Status: Compliant
          </span>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            Print Audit Dossier
          </Button>
        </div>
      </Card>

      {/* Tax Summary Metrics */}
      {data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Output Tax (Sales)</p>
            <p className="text-xl font-bold tabular-nums text-foreground mt-1">
              {formatCurrency(data.outputTax?.totalOutputTax ?? 0)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Collected on customer bills</p>
          </Card>

          <Card className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Input Tax Credit (ITC)</p>
            <p className="text-xl font-bold tabular-nums text-emerald-600 mt-1">
              {formatCurrency(data.inputTaxCredit?.totalItc ?? 0)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Offset from vendor invoices</p>
          </Card>

          <Card className="p-4 border-l-4 border-l-primary">
            <p className="text-xs text-muted-foreground font-medium">Net Tax Due to Govt</p>
            <p className="text-xl font-bold tabular-nums text-primary mt-1">
              {formatCurrency(data.settlement?.netPayable ?? 0)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Output Tax − Inward ITC</p>
          </Card>

          <Card className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Next Filing Deadline</p>
            <p className="text-base font-semibold text-foreground mt-1">
              {data.settlement?.dueDate || "20th of next month"}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Monthly GSTR-3B / Sales Tax</p>
          </Card>
        </div>
      )}

      {/* Tax Distribution Tables */}
      {isLoading ? (
        <Skeleton className="h-48" />
      ) : data ? (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Output Tax by Rates */}
          <Card className="p-4">
            <h3 className="font-semibold text-sm text-foreground mb-3">Output Tax by Rate Slab</h3>
            <table className="w-full text-xs">
              <thead className="text-left text-muted-foreground border-b border-border pb-1">
                <tr>
                  <th className="py-1">Tax Slab</th>
                  <th className="py-1 text-right">Tax Collected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(data.outputTax?.rates || []).map((r) => (
                  <tr key={r.rate}>
                    <td className="py-2 text-foreground font-medium">{r.rate}</td>
                    <td className="py-2 text-right tabular-nums text-foreground">{formatCurrency(r.tax)}</td>
                  </tr>
                ))}
                <tr className="font-bold border-t-2 border-border">
                  <td className="py-2">Gross Output Tax</td>
                  <td className="py-2 text-right tabular-nums text-foreground">
                    {formatCurrency(data.outputTax?.totalOutputTax ?? 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </Card>

          {/* Input Tax Credit (ITC) */}
          <Card className="p-4">
            <h3 className="font-semibold text-sm text-foreground mb-3">Eligible Input Tax Credit (ITC)</h3>
            <table className="w-full text-xs">
              <thead className="text-left text-muted-foreground border-b border-border pb-1">
                <tr>
                  <th className="py-1">Procurement Category</th>
                  <th className="py-1 text-right">ITC Offset</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="py-2 text-foreground font-medium">Raw Ingredients &amp; Supplies</td>
                  <td className="py-2 text-right tabular-nums text-emerald-600">
                    {formatCurrency(data.inputTaxCredit?.supplies ?? 0)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 text-foreground font-medium">Eco Packaging &amp; Disposables</td>
                  <td className="py-2 text-right tabular-nums text-emerald-600">
                    {formatCurrency(data.inputTaxCredit?.packaging ?? 0)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 text-foreground font-medium">Commercial Kitchen Capital Goods</td>
                  <td className="py-2 text-right tabular-nums text-emerald-600">
                    {formatCurrency(data.inputTaxCredit?.capitalGoods ?? 0)}
                  </td>
                </tr>
                <tr className="font-bold border-t-2 border-border">
                  <td className="py-2">Total ITC Deductions</td>
                  <td className="py-2 text-right tabular-nums text-emerald-600">
                    {formatCurrency(data.inputTaxCredit?.totalItc ?? 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </Card>

          {/* HSN / SAC Code Breakdown */}
          <Card className="p-4 md:col-span-2 overflow-x-auto">
            <h3 className="font-semibold text-sm text-foreground mb-2">HSN / SAC Code Summary (Statutory Filing)</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Standard Harmonized System Nomenclature for restaurant food items, dining services, and packaged beverages.
            </p>
            <table className="w-full text-xs">
              <thead className="text-left text-muted-foreground border-b border-border pb-1">
                <tr>
                  <th className="py-1.5 pr-3 font-semibold">HSN/SAC</th>
                  <th className="py-1.5 pr-3 font-semibold">Description</th>
                  <th className="py-1.5 pr-3 font-semibold">Applicable Rate</th>
                  <th className="py-1.5 pr-3 font-semibold text-right">Taxable Turnover</th>
                  <th className="py-1.5 font-semibold text-right">Tax Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(data.hsnSummary || []).map((h) => (
                  <tr key={h.code} className="hover:bg-muted/40 transition-colors">
                    <td className="py-2 pr-3 font-mono font-bold text-foreground">{h.code}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{h.description}</td>
                    <td className="py-2 pr-3 font-medium text-foreground">{h.rate}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-foreground">
                      {formatCurrency(h.taxableValue)}
                    </td>
                    <td className="py-2 text-right tabular-nums font-semibold text-foreground">
                      {formatCurrency(h.taxAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

/* =========================================================================
   5. EXECUTIVE OVERVIEW TAB (CFO COMMAND COCKPIT)
   ========================================================================= */

interface OverviewResponse {
  period: { from: string; to: string };
  kpis: {
    grossRevenue: number;
    taxCollected: number;
    discountsGiven: number;
    netRevenue: number;
    cogs: number;
    grossProfit: number;
    laborCost: number;
    primeCost: number;
    primeCostPercent: number;
    opex: number;
    ebitda: number;
    netMarginPercent: number;
    liquidCash: number;
    runwayDays: number;
    dailyBurn: number;
    breakEvenDailySales: number;
    ordersCount: number;
  };
  expenseBreakdown: { category: string; amount: number }[];
  chartOfAccounts: {
    code: string;
    name: string;
    type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
    balance: number;
    description: string;
  }[];
}

export function ExecutiveOverviewTab({
  branchId,
  onNavigateTab,
}: {
  branchId: string | null;
  onNavigateTab: (tab: any) => void;
}) {
  const [from, setFrom] = useState(() => iso(new Date(Date.now() - 30 * 86400000)));
  const [to, setTo] = useState(() => iso(new Date()));

  const qs = `branchId=${branchId}&from=${from}&to=${to}`;
  const { data, isLoading } = useQuery({
    queryKey: ["acct", "overview", branchId, from, to],
    queryFn: () => api.get<OverviewResponse>(`/accounting/overview?${qs}`),
    enabled: !!branchId,
  });

  const setRangePreset = (days: number) => {
    setTo(iso(new Date()));
    setFrom(iso(new Date(Date.now() - days * 86400000)));
  };

  const k = data?.kpis;
  const foodCostPercent = k && k.netRevenue > 0 ? Math.round((k.cogs / k.netRevenue) * 1000) / 10 : 31.0;
  const laborPercent = k && k.netRevenue > 0 ? Math.round((k.laborCost / k.netRevenue) * 1000) / 10 : 21.5;

  return (
    <div className="flex flex-col gap-6">
      {/* Date Presets Toolbar */}
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4 bg-card/60 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1">
            Period:
          </span>
          <button
            type="button"
            onClick={() => setRangePreset(1)}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary transition-colors"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setRangePreset(7)}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary transition-colors"
          >
            Last 7 Days
          </button>
          <button
            type="button"
            onClick={() => setRangePreset(30)}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary transition-colors"
          >
            Last 30 Days
          </button>
          <button
            type="button"
            onClick={() => setRangePreset(90)}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary transition-colors"
          >
            This Quarter
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            className="w-36 h-9"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            aria-label="Overview start date"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            className="w-36 h-9"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            aria-label="Overview end date"
          />
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> Export Dossier
          </Button>
        </div>
      </Card>

      {/* Main Executive KPI Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : k ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Net Sales */}
          <Card className="p-5 relative overflow-hidden border-border bg-gradient-to-br from-card to-card/50 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Net Sales Revenue
              </span>
              <span className="rounded-full bg-emerald-500/10 p-1.5 text-emerald-600">
                <TrendingUp className="h-4 w-4" />
              </span>
            </div>
            <p className="text-2xl font-black tabular-nums text-foreground mt-2">
              {formatCurrency(k.netRevenue)}
            </p>
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
              <span>{k.ordersCount} paid orders</span>
              <span>Tax: {formatCurrency(k.taxCollected)}</span>
            </div>
          </Card>

          {/* Prime Cost */}
          <Card className="p-5 relative overflow-hidden border-border bg-gradient-to-br from-card to-card/50 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Prime Cost (COGS + Labor)
              </span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums",
                  k.primeCostPercent <= 58
                    ? "bg-emerald-500/10 text-emerald-600"
                    : k.primeCostPercent <= 65
                    ? "bg-amber-500/10 text-amber-600"
                    : "bg-rose-500/10 text-rose-600",
                )}
              >
                {k.primeCostPercent}% (Target &lt;60%)
              </span>
            </div>
            <p className="text-2xl font-black tabular-nums text-foreground mt-2">
              {formatCurrency(k.primeCost)}
            </p>
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
              <span>Food: {formatCurrency(k.cogs)}</span>
              <span>Labor: {formatCurrency(k.laborCost)}</span>
            </div>
          </Card>

          {/* EBITDA Operating Profit */}
          <Card className="p-5 relative overflow-hidden border-border bg-gradient-to-br from-card to-card/50 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                EBITDA Operating Profit
              </span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                {k.netMarginPercent}% margin
              </span>
            </div>
            <p className="text-2xl font-black tabular-nums text-foreground mt-2">
              {formatCurrency(k.ebitda)}
            </p>
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
              <span>Gross Profit: {formatCurrency(k.grossProfit)}</span>
              <span>OpEx: {formatCurrency(k.opex)}</span>
            </div>
          </Card>

          {/* Cash Runway & Buffer */}
          <Card className="p-5 relative overflow-hidden border-border bg-gradient-to-br from-card to-card/50 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Liquid Cash Reserve
              </span>
              <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[11px] font-bold text-sky-600">
                {k.runwayDays} days runway
              </span>
            </div>
            <p className="text-2xl font-black tabular-nums text-foreground mt-2">
              {formatCurrency(k.liquidCash)}
            </p>
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
              <span>Burn: {formatCurrency(k.dailyBurn)}/day</span>
              <span>Break-even: {formatCurrency(k.breakEvenDailySales)}/day</span>
            </div>
          </Card>
        </div>
      ) : null}

      {/* Hospitality Golden Ratios & Operational Health */}
      {k && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Prime Cost Ratio Breakdown */}
          <Card className="p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm text-foreground">Prime Cost Health Index</h3>
                <span className="text-xs font-semibold text-emerald-600">Industry Gold Standard</span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Prime cost represents direct food, beverage, and store labor costs. RestroFlow continuously monitors this against the 55-60% benchmark.
              </p>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Food Cost Ratio (COGS)</span>
                    <span className="font-semibold tabular-nums text-foreground">{foodCostPercent}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${Math.min(100, foodCostPercent * 2)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Labor Cost Ratio</span>
                    <span className="font-semibold tabular-nums text-foreground">{laborPercent}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-sky-500 rounded-full transition-all"
                      style={{ width: `${Math.min(100, laborPercent * 2)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1 font-semibold">
                    <span className="text-foreground">Total Combined Prime Cost</span>
                    <span className="text-emerald-600 tabular-nums">{k.primeCostPercent}%</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-secondary overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        k.primeCostPercent <= 58 ? "bg-emerald-500" : "bg-amber-500",
                      )}
                      style={{ width: `${Math.min(100, k.primeCostPercent)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Prime Margin Buffer:</span>
              <span className="font-semibold text-emerald-600">
                {Math.round((100 - k.primeCostPercent) * 10) / 10}% Gross Operating Spread
              </span>
            </div>
          </Card>

          {/* Daily Break-Even Target */}
          <Card className="p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm text-foreground">Break-Even &amp; Fixed Overhead</h3>
                <span className="text-xs font-semibold text-primary">Daily Threshold</span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Minimum daily gross sales required to fully cover store rent, electricity, maintenance, and permanent baseline labor.
              </p>

              <div className="p-4 rounded-xl bg-secondary/50 border border-border flex flex-col items-center justify-center text-center">
                <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                  Target Daily Gross Sales
                </span>
                <span className="text-3xl font-black tabular-nums text-foreground mt-1">
                  {formatCurrency(k.breakEvenDailySales)}
                </span>
                <span className="text-xs text-emerald-600 mt-1 font-medium">
                  Covered in ~14 orders @ avg {formatCurrency(Math.round(k.netRevenue / (k.ordersCount || 1)))}/order
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Monthly Fixed Burden:</span>
              <span className="font-semibold text-foreground">
                {formatCurrency(Math.round(k.breakEvenDailySales * 30 * 0.69))}
              </span>
            </div>
          </Card>

          {/* Operating Expense Distribution */}
          <Card className="p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm text-foreground">OpEx Category Distribution</h3>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onNavigateTab("expenses")}>
                  Manage
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Total operating expenses recorded across store utilities, lease, and equipment upkeep.
              </p>

              <div className="space-y-2.5">
                {data.expenseBreakdown.slice(0, 4).map((exp) => {
                  const pct = k.opex > 0 ? Math.round((exp.amount / k.opex) * 100) : 0;
                  return (
                    <div key={exp.category}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-foreground font-medium">{exp.category}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {formatCurrency(exp.amount)} ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                        <div className="h-full bg-primary/70 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Total OpEx Recorded:</span>
              <span className="font-bold text-foreground">{formatCurrency(k.opex)}</span>
            </div>
          </Card>
        </div>
      )}

      {/* Chart of Accounts Spotlight & Quick Jump */}
      {data && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3 border-b border-border pb-3">
            <div>
              <h3 className="font-semibold text-sm text-foreground">Active General Ledger Accounts</h3>
              <p className="text-xs text-muted-foreground">
                Live balances mapped directly from POS billing counters, inventory stock, and bank reconciliations
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => onNavigateTab("chart of accounts")}>
              View Complete Chart of Accounts ({data.chartOfAccounts.length})
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {data.chartOfAccounts.slice(0, 8).map((acc) => (
              <div
                key={acc.code}
                className="p-3 rounded-lg border border-border bg-card/60 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-primary">{acc.code}</span>
                  <span
                    className={cn(
                      "text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded",
                      acc.type === "ASSET" && "bg-sky-500/10 text-sky-600",
                      acc.type === "LIABILITY" && "bg-purple-500/10 text-purple-600",
                      acc.type === "REVENUE" && "bg-emerald-500/10 text-emerald-600",
                      acc.type === "EXPENSE" && "bg-rose-500/10 text-rose-600",
                    )}
                  >
                    {acc.type}
                  </span>
                </div>
                <p className="text-xs font-medium text-foreground mt-1 truncate">{acc.name}</p>
                <p className="text-base font-bold tabular-nums text-foreground mt-0.5">
                  {formatCurrency(acc.balance)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

/* =========================================================================
   6. CHART OF ACCOUNTS (COA) FULL EXPLORER TAB
   ========================================================================= */

export function ChartOfAccountsTab({ branchId }: { branchId: string | null }) {
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["acct", "overview", branchId],
    queryFn: () => api.get<OverviewResponse>(`/accounting/overview?branchId=${branchId}`),
    enabled: !!branchId,
  });

  const accounts = data?.chartOfAccounts ?? [];
  let filtered = accounts;

  if (typeFilter !== "ALL") {
    filtered = filtered.filter((a) => a.type === typeFilter);
  }
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter((a) => a.code.includes(q) || a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q));
  }

  const totalAssets = accounts.filter((a) => a.type === "ASSET").reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = accounts.filter((a) => a.type === "LIABILITY").reduce((s, a) => s + a.balance, 0);
  const totalEquity = accounts.filter((a) => a.type === "EQUITY").reduce((s, a) => s + a.balance, 0);

  return (
    <div className="flex flex-col gap-5">
      {/* COA Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground font-medium">Total Ledger Assets</p>
          <p className="text-xl font-bold tabular-nums text-foreground mt-1">
            {formatCurrency(totalAssets)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground font-medium">Total Ledger Liabilities</p>
          <p className="text-xl font-bold tabular-nums text-foreground mt-1">
            {formatCurrency(totalLiabilities)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground font-medium">Owner Equity &amp; Capital</p>
          <p className="text-xl font-bold tabular-nums text-foreground mt-1">
            {formatCurrency(totalEquity)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground font-medium">Active Accounts in COA</p>
          <p className="text-xl font-bold tabular-nums text-foreground mt-1">
            {accounts.length} Accounts
          </p>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {(["ALL", "ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors capitalize",
                typeFilter === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/60 text-muted-foreground hover:bg-secondary",
              )}
            >
              {t.toLowerCase()}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search account code or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 w-60 text-xs"
          />
        </div>
      </Card>

      {/* Accounts Directory Table */}
      <Card className="overflow-x-auto p-4">
        {isLoading ? (
          <Skeleton className="h-48" />
        ) : filtered.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground border-b border-border pb-2">
              <tr>
                <th className="py-2 pr-4 font-semibold w-24">Account Code</th>
                <th className="py-2 pr-4 font-semibold">Account Title</th>
                <th className="py-2 pr-4 font-semibold">Classification</th>
                <th className="py-2 pr-4 font-semibold">Description</th>
                <th className="py-2 text-right font-semibold">Current Balance ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((acc) => (
                <tr key={acc.code} className="hover:bg-muted/40 transition-colors">
                  <td className="py-2.5 pr-4 font-mono font-bold text-xs text-primary">{acc.code}</td>
                  <td className="py-2.5 pr-4 font-medium text-xs text-foreground">{acc.name}</td>
                  <td className="py-2.5 pr-4">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                        acc.type === "ASSET" && "bg-sky-500/10 text-sky-600",
                        acc.type === "LIABILITY" && "bg-purple-500/10 text-purple-600",
                        acc.type === "EQUITY" && "bg-indigo-500/10 text-indigo-600",
                        acc.type === "REVENUE" && "bg-emerald-500/10 text-emerald-600",
                        acc.type === "EXPENSE" && "bg-rose-500/10 text-rose-600",
                      )}
                    >
                      {acc.type}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-xs text-muted-foreground max-w-sm truncate">{acc.description}</td>
                  <td className="py-2.5 text-right tabular-nums text-xs font-bold text-foreground">
                    {formatCurrency(acc.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No accounts match the current filter.
          </p>
        )}
      </Card>
    </div>
  );
}


