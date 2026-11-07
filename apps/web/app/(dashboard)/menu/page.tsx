"use client";

import { EyeOff, Layers, Leaf, Pencil, Sparkles, Trash2, UtensilsCrossed } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AddCategoryDialog } from "@/components/menu/add-category-dialog";
import { AddItemDialog } from "@/components/menu/add-item-dialog";
import { CreateComboDialog } from "@/components/menu/create-combo-dialog";
import { ComboComponentsDialog } from "@/components/menu/combo-components-dialog";
import { EditCategoryDialog } from "@/components/menu/edit-category-dialog";
import { EditItemDialog } from "@/components/menu/edit-item-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ResponsiveTabs } from "@/components/ui/nav-picker";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { hasPermission, useCurrentUser } from "@/hooks/use-auth";
import { useBranch } from "@/hooks/use-branch";
import {
  useCategories,
  useDeleteCategory,
  useDeleteMenuItem,
  useMenuItems,
  type MenuCategory,
  type MenuItem,
} from "@/hooks/use-menu";
import { ApiError } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function MenuPage() {
  const { branchId } = useBranch();
  const { data: me } = useCurrentUser();
  // menu.view alone is read-only; every edit control needs menu.manage.
  const canManage = hasPermission(me?.user, "menu.manage");
  const { data: categories, isLoading: categoriesLoading } = useCategories(branchId);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined);
  const { data: items, isLoading: itemsLoading } = useMenuItems(branchId, selectedCategoryId);
  const { data: allItems } = useMenuItems(branchId);
  const deleteItem = useDeleteMenuItem(branchId);
  const deleteCategory = useDeleteCategory(branchId);
  const [comboItem, setComboItem] = useState<MenuItem | null>(null);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const selectedCategory = categories?.find((c) => c.id === selectedCategoryId);
  const comboCount = useMemo(() => (allItems ?? []).filter((i) => i.isCombo).length, [allItems]);

  // If "combos" is selected, filter from allItems to strictly show combo meals
  const displayedItems = useMemo(() => {
    if (selectedCategoryId === "combos") {
      return (allItems ?? []).filter((i) => i.isCombo);
    }
    return items ?? [];
  }, [selectedCategoryId, allItems, items]);

  const onDeleteCategory = (category: MenuCategory) => {
    if (!confirm(`Delete the "${category.name}" category? This cannot be undone.`)) return;
    deleteCategory.mutate(category.id, {
      onSuccess: () => {
        toast.success(`"${category.name}" deleted`);
        if (selectedCategoryId === category.id) setSelectedCategoryId(undefined);
      },
      onError: (err) =>
        toast.error(
          err instanceof ApiError ? err.message : "Could not delete category — remove its items first",
        ),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-semibold tracking-tight text-foreground">Menu</h1>
          <p className="text-sm text-muted-foreground">{canManage ? "Categories, items, combos, and pricing" : "Categories, items, combos, and pricing (view only)"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[270px_1fr]">
        <Card className="flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[13px] font-medium uppercase tracking-wide text-muted-foreground">
              Categories
            </h2>
          </div>

          {categoriesLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-9 rounded-lg" />
              ))}
            </div>
          ) : (
            <>
            {/* Phones: swipeable row of tap chips */}
            <div className="flex flex-col gap-3 lg:hidden">
              <ResponsiveTabs
                mobileOnly
                label="Category"
                value={selectedCategoryId ?? "all"}
                onChange={(id) => setSelectedCategoryId(id === "all" ? undefined : id)}
                items={[
                  { id: "all", label: "All items" },
                  { id: "combos", label: "🍱 Combos", hint: `${comboCount} bundles` },
                  ...(categories ?? []).map((c) => ({
                    id: c.id,
                    label: c.name,
                    hint: `${c._count.items} items${c.showOnWebsite ? "" : " · hidden"}`,
                  })),
                ]}
              />
              {selectedCategory && (
                <div className="flex items-center justify-between gap-2 rounded-lg bg-secondary/60 px-3 py-2">
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium text-foreground">{selectedCategory.name}</span>
                    {!selectedCategory.showOnWebsite && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <EyeOff className="h-3 w-3" /> Hidden from website
                      </span>
                    )}
                  </span>
                  {canManage && (
                    <div className="flex shrink-0 gap-1">
                      <Button variant="ghost" size="sm" className="h-10 gap-1.5 px-3" onClick={() => setEditingCategory(selectedCategory)}>
                        <Pencil className="h-4 w-4" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="h-10 gap-1.5 px-3 text-destructive" onClick={() => onDeleteCategory(selectedCategory)}>
                        <Trash2 className="h-4 w-4" /> Delete
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="hidden flex-col gap-1 lg:flex">
              {/* All Items Option */}
              <button
                onClick={() => setSelectedCategoryId(undefined)}
                className={cn(
                  "flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                  !selectedCategoryId
                    ? "bg-accent text-accent-foreground font-semibold"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <span>All items</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {(allItems ?? []).length}
                </span>
              </button>

              {/* Dedicated Combos Section Button */}
              <button
                onClick={() => setSelectedCategoryId("combos")}
                className={cn(
                  "flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition-all",
                  selectedCategoryId === "combos"
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold border border-amber-500/30"
                    : "text-muted-foreground hover:bg-amber-500/10 hover:text-amber-600",
                )}
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span>Combos & Meals</span>
                </span>
                <Badge
                  variant="secondary"
                  className={cn(
                    "h-5 px-1.5 text-[11px] font-bold tabular-nums",
                    selectedCategoryId === "combos"
                      ? "bg-amber-500 text-white dark:bg-amber-500 dark:text-black"
                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                  )}
                >
                  {comboCount}
                </Badge>
              </button>

              <div className="my-1.5 h-px bg-border/60" />

              {/* Regular Categories */}
              {categories?.map((cat) => (
                <div
                  key={cat.id}
                  className={cn(
                    "group flex items-center justify-between rounded-lg pl-3 pr-1 py-1 text-left text-sm font-medium transition-colors",
                    selectedCategoryId === cat.id
                      ? "bg-accent text-accent-foreground font-semibold"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <button
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className="min-w-0 flex-1 truncate py-1 text-left"
                  >
                    {cat.name}
                  </button>
                  {!cat.showOnWebsite && (
                    <span title="Hidden from website" className="mr-1 shrink-0 text-muted-foreground">
                      <EyeOff className="h-3.5 w-3.5" />
                      <span className="sr-only">Hidden from website</span>
                    </span>
                  )}
                  <span className={cn("shrink-0 text-xs text-muted-foreground", canManage && "group-hover:hidden")}>
                    {cat._count.items}
                  </span>
                  {canManage && (
                    <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-primary"
                        title="Edit category"
                        onClick={() => setEditingCategory(cat)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        title="Delete category"
                        onClick={() => onDeleteCategory(cat)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            </>
          )}

          {canManage && <AddCategoryDialog branchId={branchId} />}
        </Card>

        <Card className="flex flex-col gap-4 p-4 sm:p-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-[18px] font-semibold text-foreground flex items-center gap-2">
                {selectedCategoryId === "combos" ? (
                  <>
                    <Sparkles className="h-5 w-5 text-amber-500" />
                    <span>Combo Meals & Value Bundles</span>
                  </>
                ) : selectedCategory ? (
                  selectedCategory.name
                ) : (
                  "All Menu Items"
                )}
              </h2>
              <p className="text-xs text-muted-foreground">
                {selectedCategoryId === "combos"
                  ? "Multi-item meal bundles with customer savings and special packaging"
                  : `${displayedItems.length} items listed`}
              </p>
            </div>

            {canManage && (
              <div className="flex items-center gap-2">
                <CreateComboDialog
                  branchId={branchId}
                  categories={categories ?? []}
                  allItems={allItems ?? []}
                  onComboCreated={() => setSelectedCategoryId("combos")}
                />
                {selectedCategoryId !== "combos" && (
                  <AddItemDialog branchId={branchId} categories={categories ?? []} />
                )}
              </div>
            )}
          </div>

          {itemsLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : displayedItems && displayedItems.length > 0 ? (
            <>
            <ul className="flex flex-col divide-y divide-border md:hidden">
              {displayedItems.map((item) => (
                <li key={item.id} className="flex flex-col gap-2 py-3 first:pt-0">
                  <div className="flex items-start gap-3">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- uploaded asset served from the backend, not a Next-optimizable remote source
                      <img src={item.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-md object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                        {item.isCombo ? <Sparkles className="h-5 w-5 text-amber-500" /> : <UtensilsCrossed className="h-5 w-5" />}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                        {item.isVeg && <Leaf className="h-3.5 w-3.5 shrink-0 text-success" />}
                        <span className="min-w-0 break-words">{item.name}</span>
                        {item.isCombo && (
                          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px] font-bold py-0 h-4">
                            COMBO
                          </Badge>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.category.name}
                        {item.station ? ` · ${item.station.name}` : ""}
                        {` · ${Number(item.taxRatePercent)}% tax`}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{formatCurrency(item.price)}</p>
                  </div>
                  {canManage && (
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn("h-10 gap-1.5 px-3", item.isCombo && "text-amber-600 border-amber-500/30 bg-amber-500/5")}
                        onClick={() => setComboItem(item)}
                      >
                        <Layers className="h-4 w-4" /> {item.isCombo ? "Items in Combo" : "Make Combo"}
                      </Button>
                      <Button variant="outline" size="sm" className="h-10 gap-1.5 px-3" onClick={() => setEditingItem(item)}>
                        <Pencil className="h-4 w-4" /> Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 text-destructive"
                        aria-label={`Delete ${item.name}`}
                        onClick={() =>
                          deleteItem.mutate(item.id, {
                            onSuccess: () => toast.success(`${item.name} removed`),
                            onError: (err) =>
                              toast.error(err instanceof ApiError ? err.message : "Could not remove item"),
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>

            <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Station</TableHead>
                  <TableHead className="text-right">Selling Price</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedItems.map((item) => (
                  <TableRow key={item.id} className={cn(item.isCombo && "bg-amber-500/[0.02]")}>
                    <TableCell className="font-medium text-foreground">
                      <div className="flex items-center gap-3">
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- uploaded asset served from the backend, not a Next-optimizable remote source
                          <img
                            src={item.imageUrl}
                            alt=""
                            className="h-9 w-9 shrink-0 rounded-md object-cover"
                          />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                            {item.isCombo ? <Sparkles className="h-4 w-4 text-amber-500" /> : <UtensilsCrossed className="h-4 w-4" />}
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          {item.isVeg && <Leaf className="h-3.5 w-3.5 shrink-0 text-success" />}
                          <span className="font-medium">{item.name}</span>
                          {item.isCombo && (
                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px] font-bold py-0 h-4">
                              COMBO
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.category.name}</TableCell>
                    <TableCell>
                      {item.isCombo ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                          <Sparkles className="h-3.5 w-3.5" /> Bundle
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Individual</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.station ? (
                        <Badge variant="secondary" className="font-normal text-xs">
                          {item.station.name}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {formatCurrency(item.price)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground text-xs">
                      {Number(item.taxRatePercent)}%
                    </TableCell>
                    <TableCell>
                      {canManage && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "h-8 w-8 text-muted-foreground hover:text-primary",
                              item.isCombo && "text-amber-600 hover:text-amber-700",
                            )}
                            title={item.isCombo ? "Manage Items in Combo" : "Convert to Combo"}
                            onClick={() => setComboItem(item)}
                          >
                            <Layers className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            title="Edit item"
                            onClick={() => setEditingItem(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            title="Delete item"
                            onClick={() =>
                              deleteItem.mutate(item.id, {
                                onSuccess: () => toast.success(`${item.name} removed`),
                                onError: (err) =>
                                  toast.error(err instanceof ApiError ? err.message : "Could not remove item"),
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Sparkles className="h-6 w-6" />
              </div>
              <p className="text-base font-semibold text-foreground">
                {selectedCategoryId === "combos" ? "No combo meals created yet" : "No items yet"}
              </p>
              <p className="max-w-sm text-xs text-muted-foreground">
                {selectedCategoryId === "combos"
                  ? "Bundle items together at a discounted combo price to boost your restaurant's average ticket size!"
                  : "Add your menu categories and items to get started with billing."}
              </p>
              {canManage && selectedCategoryId === "combos" && (
                <CreateComboDialog
                  branchId={branchId}
                  categories={categories ?? []}
                  allItems={allItems ?? []}
                  onComboCreated={() => setSelectedCategoryId("combos")}
                />
              )}
            </div>
          )}
        </Card>
      </div>

      <ComboComponentsDialog
        branchId={branchId}
        item={comboItem}
        allItems={allItems ?? []}
        open={!!comboItem}
        onOpenChange={(open) => !open && setComboItem(null)}
      />

      {editingCategory && (
        <EditCategoryDialog
          branchId={branchId}
          category={editingCategory}
          onClose={() => setEditingCategory(null)}
        />
      )}

      {editingItem && (
        <EditItemDialog
          branchId={branchId}
          item={editingItem}
          categories={categories ?? []}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  );
}
