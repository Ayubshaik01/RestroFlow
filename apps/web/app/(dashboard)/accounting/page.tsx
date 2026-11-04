"use client";

import {
  BarChart3,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle2,
  DollarSign,
  FileSpreadsheet,
  FileText,
  Landmark,
  Layers,
  PieChart,
  Plus,
  Receipt,
  Scale,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAccountingActions,
  useBranchOverview,
  useClosingPreview,
  useClosings,
  useExpenses,
  useGst,
  useProfitLoss,
} from "@/hooks/use-accounting";
import { useBranch } from "@/hooks/use-branch";
import { ApiError } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BalanceSheetTab, BankTab, BudgetsTab } from "@/components/accounting/finance-tabs";
import {
  GeneralLedgerTab,
  VendorBillsTab,
  CashFlowTab,
  TaxAuditTab,
  ExecutiveOverviewTab,
  ChartOfAccountsTab,
} from "@/components/accounting/accounting-suite";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const errMsg = (e: unknown) => (e instanceof ApiError ? e.message : "Something went wrong");

const TAB_GROUPS = [
  {
    name: "CFO Cockpit",
    tabs: [
      { id: "overview", label: "Executive Dashboard", icon: BarChart3 },
    ],
  },
  {
    name: "Financial Statements",
    tabs: [
      { id: "profit & loss", label: "Income Statement (P&L)", icon: TrendingUp },
      { id: "balance sheet", label: "Balance Sheet", icon: Scale },
      { id: "cash flow", label: "Cash Flow Statement", icon: DollarSign },
    ],
  },
  {
    name: "Daily Cash & Banking",
    tabs: [
      { id: "cash close", label: "Cash Till Close", icon: Wallet },
      { id: "expenses", label: "Expenses Tracker", icon: Receipt },
      { id: "bank", label: "Bank Reconciliation", icon: Landmark },
    ],
  },
  {
    name: "Payables & Budgets",
    tabs: [
      { id: "vendor bills", label: "Vendor Bills & AP", icon: FileText },
      { id: "budgets", label: "Budgets & Targets", icon: PieChart },
    ],
  },
  {
    name: "Ledger & Statutory",
    tabs: [
      { id: "general ledger", label: "General Ledger", icon: BookOpen },
      { id: "chart of accounts", label: "Chart of Accounts", icon: Layers },
      { id: "tax audit", label: "Tax Audit & ITC", icon: ShieldCheck },
      { id: "gst", label: "GST Summary", icon: FileSpreadsheet },
    ],
  },
  {
    name: "Multi-Store",
    tabs: [
      { id: "branches", label: "Branch Comparison", icon: Building2 },
    ],
  },
] as const;

type Tab =
  | "overview"
  | "profit & loss"
  | "balance sheet"
  | "cash flow"
  | "cash close"
  | "expenses"
  | "bank"
  | "vendor bills"
  | "budgets"
  | "general ledger"
  | "chart of accounts"
  | "tax audit"
  | "gst"
  | "branches";

function monthRange() {
  const now = new Date();
  return {
    from: iso(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))),
    to: iso(now),
  };
}

function RangePicker({
  range,
  onChange,
}: {
  range: { from: string; to: string };
  onChange: (r: { from: string; to: string }) => void;
}) {
  return (
    <div className="flex gap-2">
      <Input
        type="date"
        className="w-36 h-9 text-xs"
        value={range.from}
        onChange={(e) => onChange({ ...range, from: e.target.value })}
        aria-label="Start date"
      />
      <Input
        type="date"
        className="w-36 h-9 text-xs"
        value={range.to}
        onChange={(e) => onChange({ ...range, to: e.target.value })}
        aria-label="End date"
      />
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex justify-between py-2 text-sm", strong && "border-t border-border font-semibold")}>
      <span className={strong ? "text-foreground" : "text-muted-foreground"}>{label}</span>
      <span className="tabular-nums font-medium">{value}</span>
    </div>
  );
}

/* ----------------------------- Expenses Tab ----------------------------- */

function Expenses({ branchId }: { branchId: string | null }) {
  const [range, setRange] = useState(monthRange);
  const { data, isLoading } = useExpenses(branchId, range.from, range.to);
  const { addExpense, deleteExpense } = useAccountingActions(branchId);
  const [f, setF] = useState({ spentOn: iso(new Date()), category: "", amount: "", note: "", paidFromCash: false });
  const total = data?.reduce((s, e) => s + Number(e.amount), 0) ?? 0;

  const submit = () => {
    const amount = Number(f.amount);
    if (!f.category.trim() || !(amount > 0)) return toast.error("Enter a category and an amount");
    addExpense.mutate(
      { spentOn: f.spentOn, category: f.category.trim(), amount, note: f.note || undefined, paidFromCash: f.paidFromCash },
      {
        onSuccess: () => {
          toast.success("Expense added");
          setF({ ...f, category: "", amount: "", note: "" });
        },
        onError: (e) => toast.error(errMsg(e)),
      },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5 bg-card/60">
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Date</label>
          <Input type="date" className="h-9 text-xs" value={f.spentOn} onChange={(e) => setF({ ...f, spentOn: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Category</label>
          <Input placeholder="Rent, Ingredients, Utilities…" className="h-9 text-xs" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Amount ($)</label>
          <Input placeholder="0.00" inputMode="decimal" className="h-9 text-xs font-semibold tabular-nums" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Memo / Supplier</label>
          <Input placeholder="Invoice or memo note" className="h-9 text-xs" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
        </div>
        <div className="flex flex-col justify-end">
          <label className="flex items-center gap-2 text-xs text-muted-foreground h-9 cursor-pointer">
            <input type="checkbox" className="rounded" checked={f.paidFromCash} onChange={(e) => setF({ ...f, paidFromCash: e.target.checked })} />
            Paid from cash till
          </label>
        </div>
        <div className="sm:col-span-2 lg:col-span-5 flex justify-end">
          <Button size="sm" onClick={submit} disabled={addExpense.isPending}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Record Expense
          </Button>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <RangePicker range={range} onChange={setRange} />
        <span className="text-xs text-muted-foreground font-medium">
          Total Spent: <strong className="text-foreground tabular-nums text-sm">{formatCurrency(total)}</strong>
        </span>
      </div>

      <Card className="flex flex-col divide-y divide-border p-2">
        {isLoading ? (
          <Skeleton className="m-4 h-12" />
        ) : data && data.length > 0 ? (
          <>
            {data.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-muted/40 transition-colors">
                <span>
                  <span className="font-semibold text-foreground text-xs">{e.category}</span>
                  <span className="text-muted-foreground text-xs">
                    {" "}· {e.spentOn.slice(0, 10)}
                    {e.note && ` · ${e.note}`}
                    {e.paidFromCash && " · Cash Till"}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-bold tabular-nums text-foreground">{formatCurrency(e.amount)}</span>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground hover:text-destructive" onClick={() => deleteExpense.mutate(e.id, { onError: (err) => toast.error(errMsg(err)) })}>
                    Delete
                  </Button>
                </span>
              </div>
            ))}
            <div className="flex justify-between px-4 py-3 text-sm font-bold bg-muted/20">
              <span>Period Total</span>
              <span className="tabular-nums text-foreground">{formatCurrency(total)}</span>
            </div>
          </>
        ) : (
          <p className="p-8 text-center text-sm text-muted-foreground">No expenses recorded in this range.</p>
        )}
      </Card>
    </div>
  );
}

/* ----------------------------- Cash Close Tab ----------------------------- */

function CashClose({ branchId }: { branchId: string | null }) {
  const [date, setDate] = useState(() => iso(new Date()));
  const [floor, setFloor] = useState("200");
  const [counted, setCounted] = useState("");
  const [note, setNote] = useState("");
  const { data: preview } = useClosingPreview(branchId, date, Number(floor) || 0);
  const { data: closings } = useClosings(branchId);
  const { closeDay } = useAccountingActions(branchId);
  const variance = preview && counted !== "" ? Number(counted) - preview.expectedCash : null;

  return (
    <div className="flex flex-col gap-5">
      <Card className="flex flex-col gap-4 p-5 bg-card/60">
        <div>
          <h3 className="font-semibold text-foreground text-sm">Register Till &amp; Drawer Balancing</h3>
          <p className="text-xs text-muted-foreground">Reconcile physical register cash against POS sales and till expenses</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Business Date</label>
            <Input type="date" className="w-40 h-9 text-xs" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Opening Float ($)</label>
            <Input className="w-40 h-9 text-xs tabular-nums" inputMode="decimal" placeholder="Opening float" value={floor} onChange={(e) => setFloor(e.target.value)} />
          </div>
        </div>

        {preview && (
          <div className="rounded-xl border border-border bg-secondary/40 p-4 divide-y divide-border/60">
            <Row label="Opening Register Float" value={formatCurrency(preview.openingFloat)} />
            <Row label="Gross Cash Sales (Net of Cash Refunds)" value={formatCurrency(preview.cashSales)} />
            <Row label="Disbursements & Expenses Paid From Till" value={`− ${formatCurrency(preview.cashExpenses)}`} />
            <Row strong label="Total Expected in Till" value={formatCurrency(preview.expectedCash)} />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Physical Counted Cash ($)</label>
            <Input className="w-48 h-9 text-sm font-bold tabular-nums" inputMode="decimal" placeholder="Counted cash" value={counted} onChange={(e) => setCounted(e.target.value)} />
          </div>
          {variance != null && (
            <div className="pt-5">
              <span className={cn("text-xs font-bold px-3 py-1.5 rounded-full inline-flex items-center gap-1", variance === 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600")}>
                {variance === 0 ? "✓ Drawer Balanced Exactly" : `${variance > 0 ? "Overage (Surplus)" : "Shortage (Deficit)"} of ${formatCurrency(Math.abs(variance))}`}
              </span>
            </div>
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Notes / Discrepancy Reason</label>
          <Input placeholder="Optional shift handover or audit note" className="h-9 text-xs" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <div>
          <Button
            size="sm"
            disabled={counted === "" || closeDay.isPending}
            onClick={() =>
              closeDay.mutate(
                { businessDate: date, openingFloat: Number(floor) || 0, countedCash: Number(counted), note: note || undefined },
                { onSuccess: () => { toast.success("Day closed and locked in ledger"); setCounted(""); setNote(""); }, onError: (e) => toast.error(errMsg(e)) },
              )
            }
          >
            Lock &amp; Close Day
          </Button>
        </div>
      </Card>

      <Card className="flex flex-col divide-y divide-border p-2">
        <div className="px-4 py-2 font-semibold text-xs text-muted-foreground uppercase tracking-wider">
          Recent Shift &amp; Day Closings
        </div>
        {closings && closings.length > 0 ? (
          closings.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/40 transition-colors">
              <span className="font-medium text-xs text-foreground">{c.businessDate.slice(0, 10)}</span>
              <span className="text-muted-foreground text-xs tabular-nums">
                Expected: {formatCurrency(c.expectedCash)} · Counted: {formatCurrency(c.countedCash)} ·{" "}
                <span className={cn("font-semibold", Number(c.variance) === 0 ? "text-emerald-600" : "text-rose-600")}>
                  Variance: {formatCurrency(c.variance)}
                </span>
              </span>
            </div>
          ))
        ) : (
          <p className="p-8 text-center text-sm text-muted-foreground">No closed days recorded yet.</p>
        )}
      </Card>
    </div>
  );
}

/* ----------------------------- Profit & Loss Tab ----------------------------- */

function ProfitLossTab({ branchId }: { branchId: string | null }) {
  const [range, setRange] = useState(monthRange);
  const { data } = useProfitLoss(branchId, range.from, range.to);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <RangePicker range={range} onChange={setRange} />
        <Button size="sm" variant="outline" onClick={() => window.print()}>
          Print Income Statement
        </Button>
      </div>

      <Card className="p-6">
        <div className="border-b border-border pb-3 mb-4 flex justify-between items-start">
          <div>
            <h2 className="text-lg font-bold text-foreground">Statement of Profit &amp; Loss</h2>
            <p className="text-xs text-muted-foreground">Reporting Period: {range.from} to {range.to}</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-secondary text-muted-foreground">
            Accrual &amp; Cash Basis
          </span>
        </div>

        {data ? (
          <div className="divide-y divide-border">
            <div className="pb-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Operating Revenue</p>
              <Row label={`Gross Collections from ${data.orders} Paid Orders (excl. tips)`} value={formatCurrency(data.grossCollected)} />
              <Row label="Sales Tax / GST Collected" value={`− ${formatCurrency(data.taxCollected)}`} />
              <Row label="Customer Refunds & Voids" value={`− ${formatCurrency(data.refunds)}`} />
              <Row strong label="Net Sales Revenue" value={formatCurrency(data.netSales)} />
            </div>

            <div className="py-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Operating Expenses &amp; Direct Costs</p>
              {data.expenses.map((e) => (
                <Row key={e.category} label={e.category} value={`− ${formatCurrency(e.amount)}`} />
              ))}
              <Row label="Staff Payroll & Wages" value={`− ${formatCurrency(data.payrollCost)}`} />
              <Row strong label="Total Operating Costs" value={`− ${formatCurrency(data.totalExpenses + data.payrollCost)}`} />
            </div>

            <div className="pt-3">
              <div className="flex justify-between py-2 text-base font-black">
                <span className="text-foreground">Net Operating Profit (EBITDA)</span>
                <span className={cn("tabular-nums", data.netProfit >= 0 ? "text-emerald-600" : "text-rose-600")}>
                  {formatCurrency(data.netProfit)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <Skeleton className="h-48" />
        )}
      </Card>
    </div>
  );
}

/* ----------------------------- GST / Tax Tab ----------------------------- */

function GstTab({ branchId }: { branchId: string | null }) {
  const [range, setRange] = useState(monthRange);
  const { data } = useGst(branchId, range.from, range.to);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <RangePicker range={range} onChange={setRange} />
        <Button size="sm" variant="outline" onClick={() => window.print()}>
          Print Tax Summary
        </Button>
      </div>

      <Card className="overflow-x-auto p-5">
        <h3 className="font-semibold text-sm text-foreground mb-3">Statutory GST Rate Slabs</h3>
        {data ? (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground border-b border-border pb-2">
              <tr>
                <th className="py-2">Rate Slab</th>
                <th className="py-2">Taxable Base Turnover</th>
                <th className="py-2">Tax Amount</th>
                <th className="py-2 text-right">Gross Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.rows.map((r) => (
                <tr key={r.ratePercent} className="hover:bg-muted/40 transition-colors">
                  <td className="py-2 font-medium text-foreground">{r.ratePercent}%</td>
                  <td className="py-2 tabular-nums">{formatCurrency(r.taxableValue)}</td>
                  <td className="py-2 tabular-nums font-semibold">{formatCurrency(r.tax)}</td>
                  <td className="py-2 text-right tabular-nums">{formatCurrency(r.total)}</td>
                </tr>
              ))}
              <tr className="font-bold border-t-2 border-border bg-muted/20">
                <td className="py-2.5">Total</td>
                <td className="py-2.5 tabular-nums">{formatCurrency(data.totalTaxable)}</td>
                <td className="py-2.5 tabular-nums text-primary">{formatCurrency(data.totalTax)}</td>
                <td className="py-2.5 text-right tabular-nums">{formatCurrency(data.totalTaxable + data.totalTax)}</td>
              </tr>
            </tbody>
          </table>
        ) : (
          <Skeleton className="h-32" />
        )}
        <p className="mt-4 text-xs text-muted-foreground">
          Calculated automatically from paid counter and online dining orders with discounts applied pro-rata.
        </p>
      </Card>
    </div>
  );
}

/* ----------------------------- Multi-Branch Tab ----------------------------- */

function BranchesTab() {
  const [range, setRange] = useState(monthRange);
  const { data } = useBranchOverview(range.from, range.to);

  return (
    <div className="flex flex-col gap-4">
      <RangePicker range={range} onChange={setRange} />
      <Card className="overflow-x-auto p-5">
        <h3 className="font-semibold text-sm text-foreground mb-3">Store Locations Overview</h3>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground border-b border-border pb-2">
            <tr>
              <th className="py-2">Branch Name</th>
              <th className="py-2">Orders</th>
              <th className="py-2">Sales Turnover</th>
              <th className="py-2">Active Open Tabs</th>
              <th className="py-2">Low Stock Alerts</th>
              <th className="py-2 text-right">Inventory Asset Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data?.map((b) => (
              <tr key={b.branchId} className="hover:bg-muted/40 transition-colors">
                <td className="py-2.5 font-semibold text-foreground">{b.name}</td>
                <td className="py-2.5 tabular-nums">{b.orders}</td>
                <td className="py-2.5 tabular-nums font-semibold">{formatCurrency(b.sales)}</td>
                <td className="py-2.5 tabular-nums">{b.openOrders}</td>
                <td className="py-2.5">
                  <span className={cn("text-xs font-semibold px-2 py-0.5 rounded", b.lowStockItems > 0 ? "bg-rose-500/10 text-rose-600" : "text-muted-foreground")}>
                    {b.lowStockItems} items
                  </span>
                </td>
                <td className="py-2.5 text-right tabular-nums font-medium">{formatCurrency(b.inventoryValue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ----------------------------- Main Master Page ----------------------------- */

export default function AccountingPage() {
  const { branchId } = useBranch();
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <div className="flex flex-col gap-6">
      {/* Executive Command Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[30px] font-bold tracking-tight text-foreground">
              Financial Command Center
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
              <CheckCircle2 className="h-3 w-3" /> System Balanced
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            RestroFlow Financial Suite • Executive CFO Cockpit, P&amp;L, Balance Sheet, Double-Entry Ledger, AP/AR &amp; Tax Audit
          </p>
        </div>

        {/* Quick Action Navigation Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setTab("expenses")}>
            <Plus className="mr-1 h-3 w-3" /> Record Expense
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setTab("vendor bills")}>
            <Plus className="mr-1 h-3 w-3" /> Vendor Bill
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setTab("general ledger")}>
            <Plus className="mr-1 h-3 w-3" /> Journal Entry
          </Button>
          <Button size="sm" className="h-8 text-xs" onClick={() => setTab("cash close")}>
            <Wallet className="mr-1 h-3 w-3" /> Close Till
          </Button>
        </div>
      </div>

      {/* Grouped Tab Navigation Bar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {TAB_GROUPS.map((group) => (
            <div key={group.name} className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-secondary/40 border border-border">
              {group.tabs.map((t) => {
                const Icon = t.icon;
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id as Tab)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Tab Panels */}
      {tab === "overview" && <ExecutiveOverviewTab branchId={branchId} onNavigateTab={(t) => setTab(t)} />}
      {tab === "profit & loss" && <ProfitLossTab branchId={branchId} />}
      {tab === "balance sheet" && <BalanceSheetTab branchId={branchId} />}
      {tab === "cash flow" && <CashFlowTab branchId={branchId} />}
      {tab === "cash close" && <CashClose branchId={branchId} />}
      {tab === "expenses" && <Expenses branchId={branchId} />}
      {tab === "bank" && <BankTab branchId={branchId} />}
      {tab === "vendor bills" && <VendorBillsTab branchId={branchId} />}
      {tab === "budgets" && <BudgetsTab branchId={branchId} />}
      {tab === "general ledger" && <GeneralLedgerTab branchId={branchId} />}
      {tab === "chart of accounts" && <ChartOfAccountsTab branchId={branchId} />}
      {tab === "tax audit" && <TaxAuditTab branchId={branchId} />}
      {tab === "gst" && <GstTab branchId={branchId} />}
      {tab === "branches" && <BranchesTab />}
    </div>
  );
}
