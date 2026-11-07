"use client";

import {
  AlertCircle,
  Layers,
  Minus,
  Percent,
  Plus,
  Sparkles,
  Tag,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  useCreateMenuItem,
  useStations,
  type MenuCategory,
  type MenuItem,
} from "@/hooks/use-menu";
import { useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ComboItemRow {
  itemId: string;
  quantity: number;
}

export function CreateComboDialog({
  branchId,
  categories,
  allItems,
  onComboCreated,
  trigger,
}: {
  branchId: string | null;
  categories: MenuCategory[];
  allItems: MenuItem[];
  onComboCreated?: () => void;
  trigger?: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [stationId, setStationId] = useState<string>("");
  const [comboPrice, setComboPrice] = useState("");
  const [taxRatePercent, setTaxRatePercent] = useState("5");
  const [isVeg, setIsVeg] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter out other combo items — only standard individual items can be bundled
  const eligibleItems = useMemo(
    () => allItems.filter((item) => !item.isCombo),
    [allItems],
  );

  // Initialize with the first eligible items if available
  const [rows, setRows] = useState<ComboItemRow[]>(() => {
    if (eligibleItems.length >= 2) {
      return [
        { itemId: eligibleItems[0].id, quantity: 1 },
        { itemId: eligibleItems[1].id, quantity: 1 },
      ];
    }
    if (eligibleItems.length === 1) {
      return [{ itemId: eligibleItems[0].id, quantity: 1 }];
    }
    return [];
  });

  const { data: stations } = useStations(branchId);
  const createItem = useCreateMenuItem(branchId);
  const queryClient = useQueryClient();

  // Find or default category (prefer one named "Combos" or "Meals" if present)
  const defaultCategory = useMemo(() => {
    const match = categories.find((c) =>
      c.name.toLowerCase().includes("combo") || c.name.toLowerCase().includes("meal"),
    );
    return match ? match.id : categories[0]?.id || "";
  }, [categories]);

  // Sum of individual items
  const originalTotal = useMemo(() => {
    return rows.reduce((sum, row) => {
      const item = eligibleItems.find((i) => i.id === row.itemId);
      if (!item) return sum;
      return sum + Number(item.price) * (row.quantity || 1);
    }, 0);
  }, [rows, eligibleItems]);

  const priceNum = Number(comboPrice || 0);
  const savings = originalTotal > priceNum ? originalTotal - priceNum : 0;
  const savingsPercent =
    originalTotal > 0 && savings > 0 ? Math.round((savings / originalTotal) * 100) : 0;

  const addRow = () => {
    const nextUnused = eligibleItems.find((item) => !rows.some((r) => r.itemId === item.id));
    const fallbackId = nextUnused ? nextUnused.id : eligibleItems[0]?.id || "";
    if (!fallbackId) return;
    setRows((prev) => [...prev, { itemId: fallbackId, quantity: 1 }]);
  };

  const updateRow = (index: number, patch: Partial<ComboItemRow>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const removeRow = (index: number) => {
    if (rows.length <= 1) {
      toast.error("A combo meal must contain at least 1 item");
      return;
    }
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const applyDiscount = (discountPercent: number) => {
    if (originalTotal <= 0) return;
    const discounted = Math.round(originalTotal * (1 - discountPercent / 100));
    setComboPrice(String(discounted));
  };

  const reset = () => {
    setName("");
    setCategoryId("");
    setStationId("");
    setComboPrice("");
    setTaxRatePercent("5");
    setIsVeg(true);
    setIsSubmitting(false);
    if (eligibleItems.length >= 2) {
      setRows([
        { itemId: eligibleItems[0].id, quantity: 1 },
        { itemId: eligibleItems[1].id, quantity: 1 },
      ]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter a name for the combo meal");
      return;
    }

    const realCategory =
      categories.find(
        (c) =>
          c.id !== "combos" &&
          (c.id === categoryId ||
            c.name.toLowerCase().includes("combo") ||
            c.name.toLowerCase().includes("meal")),
      ) || categories.find((c) => c.id !== "combos");

    const finalCatId =
      categoryId && categoryId !== "combos"
        ? categoryId
        : realCategory
          ? realCategory.id
          : "cat-starters";

    if (!finalCatId) {
      toast.error("Please choose or add a menu category first");
      return;
    }

    if (!comboPrice || Number(comboPrice) <= 0) {
      toast.error("Please enter a valid combo price");
      return;
    }

    if (rows.length === 0) {
      toast.error("Select at least one item to bundle in this combo");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Create the base menu item with isCombo: true
      const createdItem = await api.post<MenuItem>(
        `/menu/items?branchId=${branchId}`,
        {
          name: name.trim(),
          categoryId: finalCatId,
          stationId: stationId || undefined,
          price: Number(comboPrice),
          taxRatePercent: Number(taxRatePercent),
          isVeg,
          isCombo: true,
          isActive: true,
          spiceLevel: "NONE",
          allergens: [],
          modifierGroupIds: [],
        },
      );

      // 2. Attach the combo bundle components
      const componentsDto = rows.map((r) => ({
        componentItemId: r.itemId,
        quantity: r.quantity,
      }));

      await api.post(
        `/menu/items/${createdItem.id}/combo-components?branchId=${branchId}`,
        { components: componentsDto },
      );

      // 3. Refresh menu & combo queries
      queryClient.invalidateQueries({ queryKey: ["menu", "items", branchId] });
      queryClient.invalidateQueries({ queryKey: ["combos"] });

      toast.success(`Combo "${name}" created with ${rows.length} bundled items!`);
      setOpen(false);
      reset();
      onComboCreated?.();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create combo meal");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          trigger ?? (
            <Button size="sm" className="gap-2 font-medium bg-amber-600 hover:bg-amber-700 text-white">
              <Sparkles className="h-4 w-4" />
              <span>Create Combo Meal</span>
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">Create New Combo Meal</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Bundle individual items together at a special price to increase average order value.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 py-2">
          {/* Step 1: Combo Identity */}
          <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/20 p-3.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-amber-500" />
              1. Combo Details
            </h3>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="combo-name" className="text-xs font-medium">
                Combo Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="combo-name"
                placeholder="e.g. Royal Feast Pack (2 Biryanis + 2 Drinks)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-9"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="combo-category" className="text-xs font-medium">
                  Menu Category
                </Label>
                <Select
                  value={categoryId || defaultCategory}
                  onValueChange={(v) => v && setCategoryId(v)}
                >
                  <SelectTrigger id="combo-category" className="h-9">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="combo-station" className="text-xs font-medium">
                  Kitchen Station
                </Label>
                <Select value={stationId} onValueChange={(v) => setStationId(v ?? "")}>
                  <SelectTrigger id="combo-station" className="h-9">
                    <SelectValue placeholder="All / Default Kitchen" />
                  </SelectTrigger>
                  <SelectContent>
                    {(stations ?? []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-background p-2.5 border border-border/50">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-foreground">Dietary Classification</span>
                <span className="text-[11px] text-muted-foreground">
                  {isVeg ? "100% Pure Vegetarian Combo" : "Non-Vegetarian / Contains Meat"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("text-xs font-semibold", isVeg ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600")}>
                  {isVeg ? "VEG" : "NON-VEG"}
                </span>
                <Switch checked={isVeg} onCheckedChange={setIsVeg} />
              </div>
            </div>
          </div>

          {/* Step 2: Select Items on that Combo */}
          <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/20 p-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <UtensilsCrossed className="h-3.5 w-3.5 text-amber-500" />
                2. Select Items Included in Combo
              </h3>
              <Badge variant="outline" className="text-[11px]">
                {rows.length} {rows.length === 1 ? "Item" : "Items"}
              </Badge>
            </div>

            {eligibleItems.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                No regular menu items found. Please create regular items first before bundling them into combos.
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {rows.map((row, idx) => {
                  const selectedItem = eligibleItems.find((i) => i.id === row.itemId);
                  const lineTotal = selectedItem ? Number(selectedItem.price) * row.quantity : 0;

                  return (
                    <div
                      key={idx}
                      className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-background p-2 transition-all hover:border-primary/40"
                    >
                      <div className="min-w-0 flex-1">
                        <Select
                          value={row.itemId}
                          onValueChange={(val) => val && updateRow(idx, { itemId: val })}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Pick an item…" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {eligibleItems.map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                <span className="flex items-center justify-between gap-3">
                                  <span className="truncate">
                                    {item.isVeg ? "🟢" : "🔴"} {item.name}
                                  </span>
                                  <span className="font-semibold text-muted-foreground tabular-nums">
                                    {formatCurrency(item.price)}
                                  </span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Quantity stepper */}
                      <div className="flex items-center rounded-md border border-border bg-secondary/50">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() =>
                            updateRow(idx, { quantity: Math.max(1, row.quantity - 1) })
                          }
                          disabled={row.quantity <= 1}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-xs font-bold tabular-nums">
                          {row.quantity}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => updateRow(idx, { quantity: row.quantity + 1 })}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Line Total */}
                      <div className="w-20 text-right text-xs font-semibold tabular-nums text-foreground">
                        {formatCurrency(lineTotal)}
                      </div>

                      {/* Remove */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeRow(idx)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addRow}
                  className="mt-1 gap-1.5 border-dashed border-primary/40 text-primary hover:bg-primary/5 h-8 text-xs font-medium"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Another Item to Combo
                </Button>
              </div>
            )}
          </div>

          {/* Step 3: Set Combo Amount & See Value Savings */}
          <div className="flex flex-col gap-3 rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-orange-500/5 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <Percent className="h-3.5 w-3.5 text-amber-500" />
              3. Set Combo Amount & Value Savings
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="combo-price" className="text-xs font-medium">
                  Special Combo Price (Amount) <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="combo-price"
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="e.g. 399.00"
                    value={comboPrice}
                    onChange={(e) => setComboPrice(e.target.value)}
                    required
                    className="h-10 text-base font-bold text-primary pl-3 pr-8 tabular-nums"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-semibold">
                    NET
                  </span>
                </div>
              </div>

              {/* Discount Quick Presets */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-muted-foreground">
                  Quick Discount Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[10, 15, 20, 25].map((pct) => (
                    <Button
                      key={pct}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyDiscount(pct)}
                      className="h-7 px-2 text-[11px] font-semibold bg-background hover:bg-amber-500/10 hover:text-amber-600 hover:border-amber-500/30"
                    >
                      {pct}% OFF
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Pricing Breakdown */}
            <div className="mt-1 flex flex-col gap-2 rounded-lg bg-background/90 p-3 border border-border/80">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Sum of individual items:</span>
                <span className="font-semibold text-foreground tabular-nums">
                  {formatCurrency(originalTotal)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Combo selling price:</span>
                <span className="font-bold text-primary tabular-nums">
                  {formatCurrency(priceNum)}
                </span>
              </div>
              <div className="h-px bg-border/60" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Customer Savings:</span>
                {savings > 0 ? (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold border-emerald-500/30 text-xs">
                    Save {formatCurrency(savings)} ({savingsPercent}% OFF)
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {priceNum > originalTotal && originalTotal > 0
                      ? "Combo price is higher than individual sum"
                      : "No discount applied"}
                  </span>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || rows.length === 0}
              className="bg-amber-600 hover:bg-amber-700 text-white font-medium gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {isSubmitting ? "Saving Combo Meal…" : "Create & Save Combo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
