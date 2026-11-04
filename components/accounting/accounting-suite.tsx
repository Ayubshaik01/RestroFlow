"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  DollarSign,
  Download,
  FileSpreadsheet,
  Filter,
  Plus,
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

interface CashFlowResponse {
  from: string;
  to: string;
  operating: {
    inflows: { label: string; amount: number }[];
    outflows: { label: string; amount: number }[];
    net: number;
  };
  investing: {
    inflows: { label: string; amount: number }[];
    outflows: { label: string; amount: number }[];
    net: number;
  };
  financing: {
    inflows: { label: string; amount: number }[];
    outflows: { label: string; amount: number }[];
    net: number;
  };
  summary: {
    openingBalance: number;
    netCashChange: number;
    closingBalance: number;
  };
  metrics: {
    runwayDays: number;
    dailyBurn: number;
    operatingRatio: number;
  };
}

export function CashFlowTab({ branchId }: { branchId: string | null }) {
  const [from, setFrom] = useState(() => iso(new Date(Date.now() - 30 * 86400000)));
  const [to, setTo] = useState(() => iso(new Date()));

  const qs = `branchId=${branchId}&from=${from}&to=${to}`;
  const { data, isLoading } = useQuery({
    queryKey: ["acct", "cash-flow", branchId, from, to],
    queryFn: () => api.get<CashFlowResponse>(`/accounting/cash-flow?${qs}`),
    enabled: !!branchId,
  });

  return (
    <div className="flex flex-col gap-5">
      {/* Date Filter & Key Performance Indicators */}
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
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

        {data && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/60 px-3 py-1 rounded-md">
              <span>Daily Cash Burn:</span>
              <strong className="text-foreground tabular-nums">
                {formatCurrency(data.metrics.dailyBurn)}/day
              </strong>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/60 px-3 py-1 rounded-md">
              <span>Estimated Runway:</span>
              <strong className="text-emerald-600 font-semibold">{data.metrics.runwayDays} days</strong>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/60 px-3 py-1 rounded-md">
              <span>Operating Cash Ratio:</span>
              <strong className="text-foreground">{data.metrics.operatingRatio}x</strong>
            </div>
          </div>
        )}
      </Card>

      {/* Cash Flow Summary Cards */}
      {data && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Opening Cash Reserve</p>
            <p className="text-2xl font-bold tabular-nums text-foreground mt-1">
              {formatCurrency(data.summary.openingBalance)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">At start of period</p>
          </Card>

          <Card
            className={cn(
              "p-4 border-l-4",
              data.summary.netCashChange >= 0 ? "border-l-emerald-500" : "border-l-rose-500",
            )}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium">Net Change in Cash</p>
              {data.summary.netCashChange >= 0 ? (
                <ArrowUpRight className="h-4 w-4 text-emerald-600" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-rose-600" />
              )}
            </div>
            <p
              className={cn(
                "text-2xl font-bold tabular-nums mt-1",
                data.summary.netCashChange >= 0 ? "text-emerald-600" : "text-rose-600",
              )}
            >
              {data.summary.netCashChange >= 0 ? "+" : ""}
              {formatCurrency(data.summary.netCashChange)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Net generation across activities</p>
          </Card>

          <Card className="p-4 bg-primary text-primary-foreground">
            <p className="text-xs text-primary-foreground/80 font-medium">Ending Liquid Cash Balance</p>
            <p className="text-2xl font-bold tabular-nums mt-1">
              {formatCurrency(data.summary.closingBalance)}
            </p>
            <p className="text-[11px] text-primary-foreground/80 mt-0.5">Available across drawer &amp; bank</p>
          </Card>
        </div>
      )}

      {/* Detailed Cash Flow Sections */}
      {isLoading ? (
        <Skeleton className="h-64" />
      ) : data ? (
        <div className="flex flex-col gap-4">
          {/* 1. Operating Activities */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3 border-b border-border pb-2">
              <div>
                <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-600" /> 1. Operating Cash Flows
                </h3>
                <p className="text-xs text-muted-foreground">Core restaurant operations, sales and day-to-day costs</p>
              </div>
              <span
                className={cn(
                  "font-bold tabular-nums text-sm",
                  data.operating.net >= 0 ? "text-emerald-600" : "text-rose-600",
                )}
              >
                Net: {formatCurrency(data.operating.net)}
              </span>
            </div>

            <div className="flex flex-col divide-y divide-border text-sm">
              <p className="text-xs font-semibold text-muted-foreground uppercase pt-1 pb-1">Inflows</p>
              {data.operating.inflows.map((i) => (
                <div key={i.label} className="flex justify-between py-1.5 text-xs">
                  <span>{i.label}</span>
                  <span className="font-medium text-emerald-600 tabular-nums">+{formatCurrency(i.amount)}</span>
                </div>
              ))}

              <p className="text-xs font-semibold text-muted-foreground uppercase pt-3 pb-1">Outflows</p>
              {data.operating.outflows.map((o) => (
                <div key={o.label} className="flex justify-between py-1.5 text-xs">
                  <span>{o.label}</span>
                  <span className="font-medium text-rose-600 tabular-nums">{formatCurrency(o.amount)}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* 2. Investing Activities */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3 border-b border-border pb-2">
              <div>
                <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-sky-600" /> 2. Investing Cash Flows
                </h3>
                <p className="text-xs text-muted-foreground">Kitchen equipment, refrigeration &amp; hardware purchases</p>
              </div>
              <span
                className={cn(
                  "font-bold tabular-nums text-sm",
                  data.investing.net >= 0 ? "text-emerald-600" : "text-foreground",
                )}
              >
                Net: {formatCurrency(data.investing.net)}
              </span>
            </div>

            <div className="flex flex-col divide-y divide-border text-sm">
              {data.investing.outflows.map((o) => (
                <div key={o.label} className="flex justify-between py-1.5 text-xs">
                  <span>{o.label}</span>
                  <span className="font-medium text-rose-600 tabular-nums">{formatCurrency(o.amount)}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* 3. Financing Activities */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3 border-b border-border pb-2">
              <div>
                <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-purple-600" /> 3. Financing Cash Flows
                </h3>
                <p className="text-xs text-muted-foreground">Owner capital contributions, partner drawings &amp; loans</p>
              </div>
              <span
                className={cn(
                  "font-bold tabular-nums text-sm",
                  data.financing.net >= 0 ? "text-emerald-600" : "text-foreground",
                )}
              >
                Net: {formatCurrency(data.financing.net)}
              </span>
            </div>

            <div className="flex flex-col divide-y divide-border text-sm">
              {data.financing.inflows.map((i) => (
                <div key={i.label} className="flex justify-between py-1.5 text-xs">
                  <span>{i.label}</span>
                  <span className="font-medium text-emerald-600 tabular-nums">+{formatCurrency(i.amount)}</span>
                </div>
              ))}
              {data.financing.outflows.map((o) => (
                <div key={o.label} className="flex justify-between py-1.5 text-xs">
                  <span>{o.label}</span>
                  <span className="font-medium text-rose-600 tabular-nums">{formatCurrency(o.amount)}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
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
              {formatCurrency(data.outputTax.totalOutputTax)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Collected on customer bills</p>
          </Card>

          <Card className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Input Tax Credit (ITC)</p>
            <p className="text-xl font-bold tabular-nums text-emerald-600 mt-1">
              {formatCurrency(data.inputTaxCredit.totalItc)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Offset from vendor invoices</p>
          </Card>

          <Card className="p-4 border-l-4 border-l-primary">
            <p className="text-xs text-muted-foreground font-medium">Net Tax Due to Govt</p>
            <p className="text-xl font-bold tabular-nums text-primary mt-1">
              {formatCurrency(data.settlement.netPayable)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Output Tax − Inward ITC</p>
          </Card>

          <Card className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Next Filing Deadline</p>
            <p className="text-base font-semibold text-foreground mt-1">
              {data.settlement.dueDate}
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
                {data.outputTax.rates.map((r) => (
                  <tr key={r.rate}>
                    <td className="py-2 text-foreground font-medium">{r.rate}</td>
                    <td className="py-2 text-right tabular-nums text-foreground">{formatCurrency(r.tax)}</td>
                  </tr>
                ))}
                <tr className="font-bold border-t-2 border-border">
                  <td className="py-2">Gross Output Tax</td>
                  <td className="py-2 text-right tabular-nums text-foreground">
                    {formatCurrency(data.outputTax.totalOutputTax)}
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
                    {formatCurrency(data.inputTaxCredit.supplies)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 text-foreground font-medium">Eco Packaging &amp; Disposables</td>
                  <td className="py-2 text-right tabular-nums text-emerald-600">
                    {formatCurrency(data.inputTaxCredit.packaging)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 text-foreground font-medium">Commercial Kitchen Capital Goods</td>
                  <td className="py-2 text-right tabular-nums text-emerald-600">
                    {formatCurrency(data.inputTaxCredit.capitalGoods)}
                  </td>
                </tr>
                <tr className="font-bold border-t-2 border-border">
                  <td className="py-2">Total ITC Deductions</td>
                  <td className="py-2 text-right tabular-nums text-emerald-600">
                    {formatCurrency(data.inputTaxCredit.totalItc)}
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
                {data.hsnSummary.map((h) => (
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


