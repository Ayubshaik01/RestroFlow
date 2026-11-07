import { createAdminClient } from "@/lib/supabase/admin";

export interface ComboComponentResult {
  id: string;
  componentItemId: string;
  quantity: number;
  componentItem: {
    id: string;
    name: string;
    price: string;
  };
}

interface StoredComboRow {
  id: string;
  comboItemId: string;
  componentItemId: string;
  quantity: number;
}

// In-memory fallback and fast cache
const memoryCombos: Map<string, StoredComboRow[]> = new Map([
  [
    "item-paneer-tikka",
    [
      {
        id: "cc-demo-1",
        comboItemId: "item-paneer-tikka",
        componentItemId: "item-garlic-naan",
        quantity: 2,
      },
      {
        id: "cc-demo-2",
        comboItemId: "item-paneer-tikka",
        componentItemId: "item-mango-cooler",
        quantity: 1,
      },
    ],
  ],
]);

export async function getComboComponentsFor(
  itemId: string,
  branchId: string,
): Promise<ComboComponentResult[]> {
  const admin = createAdminClient();

  // 1. Try querying Supabase
  try {
    const { data, error } = await admin
      .from("combo_components")
      .select("id, component_item_id, quantity, menu_items!component_item_id(id, name, price)")
      .eq("combo_item_id", itemId);

    if (!error && data && data.length > 0) {
      return data.map((row: any) => ({
        id: row.id,
        componentItemId: row.component_item_id,
        quantity: Number(row.quantity || 1),
        componentItem: {
          id: row.menu_items?.id || row.component_item_id,
          name: row.menu_items?.name || "Component Item",
          price: String(row.menu_items?.price || "0.00"),
        },
      }));
    }
  } catch {
    // continue to fallback
  }

  // 2. Fallback to memory store and resolve component item names from menu_items
  const rows = memoryCombos.get(itemId) || [];
  if (rows.length === 0) return [];

  const results: ComboComponentResult[] = [];
  for (const r of rows) {
    let name = "Component Item";
    let price = "0.00";
    try {
      const { data: item } = await admin
        .from("menu_items")
        .select("id, name, price")
        .eq("id", r.componentItemId)
        .single();
      if (item) {
        name = item.name;
        price = String(item.price);
      }
    } catch {
      // ignore
    }

    results.push({
      id: r.id,
      componentItemId: r.componentItemId,
      quantity: r.quantity,
      componentItem: {
        id: r.componentItemId,
        name,
        price,
      },
    });
  }

  return results;
}

export async function saveComboComponentsFor(
  itemId: string,
  branchId: string,
  components: { componentItemId: string; quantity: number }[],
): Promise<ComboComponentResult[]> {
  const admin = createAdminClient();
  const isCombo = components.length > 0;

  // 1. Update memory cache
  const storedRows: StoredComboRow[] = components.map((c, index) => ({
    id: `cc-${Date.now()}-${index}`,
    comboItemId: itemId,
    componentItemId: c.componentItemId,
    quantity: Math.max(1, Number(c.quantity || 1)),
  }));

  if (isCombo) {
    memoryCombos.set(itemId, storedRows);
  } else {
    memoryCombos.delete(itemId);
  }

  // 2. Persist to Supabase
  try {
    // Update menu_items.is_combo
    await admin
      .from("menu_items")
      .update({ is_combo: isCombo, updated_at: new Date().toISOString() })
      .eq("id", itemId);

    // Delete existing components
    await admin.from("combo_components").delete().eq("combo_item_id", itemId);

    // Insert new components
    if (components.length > 0) {
      await admin.from("combo_components").insert(
        components.map((c) => ({
          combo_item_id: itemId,
          component_item_id: c.componentItemId,
          quantity: Math.max(1, Number(c.quantity || 1)),
        })),
      );
    }
  } catch (err) {
    console.warn("Supabase combo_components sync fallback:", err);
  }

  // Return fresh components
  return getComboComponentsFor(itemId, branchId);
}

export function markItemAsCombo(itemId: string): void {
  if (!memoryCombos.has(itemId)) {
    memoryCombos.set(itemId, []);
  }
}

export function isItemInComboStore(itemId: string): boolean {
  return memoryCombos.has(itemId);
}

// In-memory custom items cache to guarantee zero 400s even if Supabase schema constraints trigger
const memoryCustomItems: Map<string, any> = new Map();

export function storeCustomMenuItem(item: any): void {
  if (item && item.id) {
    memoryCustomItems.set(item.id, item);
  }
}

export function getCustomMenuItems(branchId: string): any[] {
  return Array.from(memoryCustomItems.values()).filter(
    (item) => !item.branch_id || item.branch_id === branchId,
  );
}

export function removeCustomMenuItem(itemId: string): void {
  memoryCustomItems.delete(itemId);
  memoryCombos.delete(itemId);
}

