"use client";

import { Minus, Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useComboComponents, useSetComboComponents, type ComboComponent } from "@/hooks/use-combos";
import type { MenuItem } from "@/hooks/use-menu";
import { ApiError } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

interface Row {
  componentItemId: string;
  quantity: number;
}

function ComboRowsEditor({
  item,
  candidates,
  existing,
  branchId,
  onSaved,
}: {
  item: MenuItem;
  candidates: MenuItem[];
  existing: ComboComponent[];
  branchId: string | null;
  onSaved: () => void;
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    existing.map((c) => ({ componentItemId: c.componentItemId, quantity: c.quantity })),
  );
  const setComponents = useSetComboComponents(branchId, item.id);

  const addRow = () => {
    const firstAvailable = candidates.find((c) => !rows.some((r) => r.componentItemId === c.id));
    if (!firstAvailable) return;
    setRows((prev) => [...prev, { componentItemId: firstAvailable.id, quantity: 1 }]);
  };

  const updateRow = (index: number, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    setComponents.mutate(
      { components: rows },
      {
        onSuccess: () => {
          toast.success(`Combo components saved for ${item.name}`);
          onSaved();
        },
        onError: (err) =>
          toast.error(err instanceof ApiError ? err.message : "Could not save combo components"),
      },
    );
  };

  const individualTotal = rows.reduce((sum, r) => {
    const found = candidates.find((c) => c.id === r.componentItemId);
    return sum + (found ? Number(found.price) * r.quantity : 0);
  }, 0);
  const comboPrice = Number(item.price || 0);
  const savings = individualTotal - comboPrice;
  const savingsPercent = individualTotal > 0 ? Math.round((savings / individualTotal) * 100) : 0;

  return (
    <>
      <div className="flex flex-col gap-3 py-2">
        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No components yet — this item sells as a regular menu item. Click &ldquo;Add component&rdquo; below to make it
            a combo bundle.
          </p>
        )}
        {rows.map((row, index) => (
          <div key={index} className="flex items-center gap-2">
            <Select
              value={row.componentItemId}
              onValueChange={(v) => v && updateRow(index, { componentItemId: v })}
            >
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({formatCurrency(c.price)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => updateRow(index, { quantity: Math.max(1, row.quantity - 1) })}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-5 text-center text-sm tabular-nums">{row.quantity}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => updateRow(index, { quantity: row.quantity + 1 })}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => removeRow(index)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          className="w-fit"
          disabled={rows.length >= candidates.length}
          onClick={addRow}
        >
          Add component
        </Button>

        {rows.length > 0 && (
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs mt-2">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Combo Selling Price:</span>
              <span className="font-semibold text-foreground">{formatCurrency(comboPrice)}</span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-muted-foreground">Components Total Value:</span>
              <span className="font-medium text-foreground">{formatCurrency(individualTotal)}</span>
            </div>
            {savings > 0 && (
              <div className="flex justify-between items-center mt-1.5 text-emerald-600 font-semibold border-t border-border pt-1.5">
                <span>Customer Savings:</span>
                <span>{formatCurrency(savings)} ({savingsPercent}% off)</span>
              </div>
            )}
          </div>
        )}
      </div>

      <DialogFooter>
        <Button disabled={setComponents.isPending} onClick={handleSave}>
          {setComponents.isPending ? "Saving…" : "Save combo"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function ComboComponentsDialog({
  branchId,
  item,
  allItems,
  open,
  onOpenChange,
}: {
  branchId: string | null;
  item: MenuItem | null;
  allItems: MenuItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: existing } = useComboComponents(branchId, item?.id ?? null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item?.name} — Combo Components</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Configure the items included in this combo deal. Components are displayed on the KOT for kitchen prep while selling at the bundle price.
          </p>
        </DialogHeader>

        {item && existing ? (
          <ComboRowsEditor
            key={item.id}
            item={item}
            candidates={allItems.filter((i) => i.id !== item.id)}
            existing={existing}
            branchId={branchId}
            onSaved={() => onOpenChange(false)}
          />
        ) : (
          <div className="flex items-center justify-center py-10">
            <span className="text-sm text-muted-foreground">Loading components…</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
