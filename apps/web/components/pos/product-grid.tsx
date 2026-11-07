"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { QueryError } from "@/components/ui/query-error";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveTabs } from "@/components/ui/nav-picker";
import { useCategories, useMenuItems, type MenuItem } from "@/hooks/use-menu";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ProductGrid({
  branchId,
  onSelect,
}: {
  branchId: string | null;
  onSelect: (item: MenuItem) => void;
}) {
  const { data: categories } = useCategories(branchId);
  const [activeCategoryId, setActiveCategoryId] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  // Ultra-fast: Fetch all items once, filter in-memory in 0ms!
  const { data: allItems, isLoading, isError, error, refetch, isFetching } = useMenuItems(branchId);

  const filtered = useMemo(() => {
    if (!allItems) return [];
    const q = search.trim().toLowerCase();
    return allItems.filter((i) => {
      const matchesCategory =
        !activeCategoryId ||
        activeCategoryId === "all" ||
        (activeCategoryId === "combos" ? i.isCombo : i.categoryId === activeCategoryId);

      if (!matchesCategory) return false;
      if (!q) return true;
      return i.name.toLowerCase().includes(q);
    });
  }, [allItems, activeCategoryId, search]);

  return (
    <div className="flex h-full flex-col gap-4">
      <Input
        placeholder="Search menu…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-11"
      />

      {categories && categories.length > 0 && (
        <ResponsiveTabs
          mobileOnly
          className="lg:hidden"
          label="Category"
          value={activeCategoryId ?? "all"}
          onChange={(id) => setActiveCategoryId(id === "all" ? undefined : id)}
          desktopListClassName="justify-start lg:h-auto lg:flex-wrap"
          items={[
            { id: "all", label: "All" },
            { id: "combos", label: "🍱 Combos" },
            ...categories.map((c) => ({ id: c.id, label: c.name, hint: `${c._count.items} items` })),
          ]}
        />
      )}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row lg:gap-5">
      {categories && categories.length > 0 && (
        <nav
          aria-label="Category"
          className="hidden w-52 shrink-0 flex-col gap-1 overflow-y-auto border-r border-border pr-3 lg:flex xl:w-60"
        >
          {[
            { id: undefined as string | undefined, name: "All", count: undefined as number | undefined },
            { id: "combos" as string | undefined, name: "🍱 Combos & Meals", count: undefined as number | undefined },
            ...categories.map((c) => ({ id: c.id as string | undefined, name: c.name, count: c._count.items as number | undefined })),
          ].map((c) => {
            const active = c.id === activeCategoryId;
            return (
              <button
                key={c.id ?? "all"}
                type="button"
                aria-current={active ? "true" : undefined}
                onClick={() => setActiveCategoryId(c.id)}
                className={cn(
                  "flex min-h-10 items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  active
                    ? "bg-primary font-semibold text-primary-foreground shadow-sm"
                    : "font-medium text-foreground hover:bg-secondary",
                )}
              >
                <span className="min-w-0 break-words leading-tight">{c.name}</span>
                {c.count !== undefined && (
                  <span className={cn("shrink-0 text-xs tabular-nums", active ? "opacity-80" : "text-muted-foreground")}>
                    {c.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      )}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {isError && !allItems ? (
        <QueryError error={error} what="the menu" onRetry={() => void refetch()} retrying={isFetching} />
      ) : (
      <div className="grid flex-1 auto-rows-min grid-cols-2 gap-3 overflow-y-auto pb-4 sm:grid-cols-3 lg:grid-cols-3 lg:gap-4 xl:grid-cols-4 2xl:grid-cols-5">
        {isLoading &&
          Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        {filtered.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item)}
            className="flex min-h-24 flex-col items-start gap-2 rounded-2xl border border-border bg-card p-3 text-left sm:p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97] active:translate-y-0 lg:min-h-32 lg:justify-between lg:p-4 lg:hover:border-primary/50"
          >
            <div className="flex w-full items-center justify-between">
              <span
                className={`h-2.5 w-2.5 rounded-full ${item.isVeg ? "bg-success" : "bg-destructive"}`}
              />
              {item.isCombo && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                  Combo
                </span>
              )}
            </div>
            <span className="text-sm font-medium leading-tight text-foreground lg:text-[15px]">{item.name}</span>
            <span className="flex w-full items-baseline justify-between gap-2">
              <span className="text-sm font-semibold tabular-nums text-foreground lg:text-base">
                {formatCurrency(item.price)}
              </span>
              {item.halfPrice != null && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  Half {formatCurrency(item.halfPrice)}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>
      )}
      </div>
      </div>
    </div>
  );
}
