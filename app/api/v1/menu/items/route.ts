import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSessionUser } from "@/lib/auth/server-session";
import { isItemInComboStore } from "@/lib/combos/combo-service";

export async function GET(req: Request) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId") || "demo-branch";
  const categoryId = searchParams.get("categoryId");

  const admin = createAdminClient();

  let query = admin
    .from("menu_items")
    .select(
      `
      id,
      category_id,
      kitchen_station_id,
      name,
      image_url,
      price,
      half_price,
      tax_rate_percent,
      is_veg,
      is_available,
      is_combo,
      sort_order,
      category:category_id (id, name),
      station:kitchen_station_id (id, name)
    `,
    )
    .eq("branch_id", branchId)
    .order("sort_order", { ascending: true });

  if (categoryId === "combos") {
    query = query.eq("is_combo", true);
  } else if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  const { data: items, error } = await query;

  if (error || !items || items.length === 0) {
    // Demo fallback menu items
    return NextResponse.json([
      {
        id: "item-paneer-tikka",
        categoryId: "cat-starters",
        stationId: "station-main",
        name: "Paneer Tikka",
        imageUrl: null,
        price: "260.00",
        halfPrice: "160.00",
        taxRatePercent: "5.00",
        isVeg: true,
        isActive: true,
        isCombo: false,
        category: { id: "cat-starters", name: "Starters & Appetizers" },
        station: { id: "station-main", name: "Main Kitchen" },
        modifierGroups: [],
      },
      {
        id: "item-chicken-wings",
        categoryId: "cat-starters",
        stationId: "station-main",
        name: "Crispy Peri-Peri Wings",
        imageUrl: null,
        price: "310.00",
        halfPrice: null,
        taxRatePercent: "5.00",
        isVeg: false,
        isActive: true,
        isCombo: false,
        category: { id: "cat-starters", name: "Starters & Appetizers" },
        station: { id: "station-main", name: "Main Kitchen" },
        modifierGroups: [],
      },
      {
        id: "item-butter-chicken",
        categoryId: "cat-mains",
        stationId: "station-main",
        name: "Old Delhi Butter Chicken",
        imageUrl: null,
        price: "390.00",
        halfPrice: "240.00",
        taxRatePercent: "5.00",
        isVeg: false,
        isActive: true,
        isCombo: false,
        category: { id: "cat-mains", name: "Main Course" },
        station: { id: "station-main", name: "Main Kitchen" },
        modifierGroups: [],
      },
      {
        id: "item-dal-makhani",
        categoryId: "cat-mains",
        stationId: "station-main",
        name: "Dal Makhani Special",
        imageUrl: null,
        price: "280.00",
        halfPrice: null,
        taxRatePercent: "5.00",
        isVeg: true,
        isActive: true,
        isCombo: false,
        category: { id: "cat-mains", name: "Main Course" },
        station: { id: "station-main", name: "Main Kitchen" },
        modifierGroups: [],
      },
      {
        id: "item-garlic-naan",
        categoryId: "cat-breads",
        stationId: "station-main",
        name: "Butter Garlic Naan",
        imageUrl: null,
        price: "70.00",
        halfPrice: null,
        taxRatePercent: "5.00",
        isVeg: true,
        isActive: true,
        isCombo: false,
        category: { id: "cat-breads", name: "Breads & Rice" },
        station: { id: "station-main", name: "Main Kitchen" },
        modifierGroups: [],
      },
      {
        id: "item-biryani",
        categoryId: "cat-breads",
        stationId: "station-main",
        name: "Hyderabadi Dum Biryani",
        imageUrl: null,
        price: "350.00",
        halfPrice: null,
        taxRatePercent: "5.00",
        isVeg: false,
        isActive: true,
        isCombo: false,
        category: { id: "cat-breads", name: "Breads & Rice" },
        station: { id: "station-main", name: "Main Kitchen" },
        modifierGroups: [],
      },
      {
        id: "item-mango-cooler",
        categoryId: "cat-drinks",
        stationId: "station-bar",
        name: "Fresh Mango Mint Cooler",
        imageUrl: null,
        price: "160.00",
        halfPrice: null,
        taxRatePercent: "5.00",
        isVeg: true,
        isActive: true,
        isCombo: false,
        category: { id: "cat-drinks", name: "Beverages" },
        station: { id: "station-bar", name: "Beverage Bar" },
        modifierGroups: [],
      },
      {
        id: "item-gulab-jamun",
        categoryId: "cat-desserts",
        stationId: "station-main",
        name: "Gulab Jamun with Ice Cream",
        imageUrl: null,
        price: "140.00",
        halfPrice: null,
        taxRatePercent: "5.00",
        isVeg: true,
        isActive: true,
        isCombo: false,
        category: { id: "cat-desserts", name: "Desserts" },
        station: { id: "station-main", name: "Main Kitchen" },
        modifierGroups: [],
      },
    ]);
  }

  const formatted = items.map((i: any) => ({
    id: i.id,
    categoryId: i.category_id,
    stationId: i.kitchen_station_id,
    name: i.name,
    imageUrl: i.image_url,
    price: String(i.price),
    halfPrice: i.half_price ? String(i.half_price) : null,
    taxRatePercent: String(i.tax_rate_percent),
    isVeg: i.is_veg,
    isActive: i.is_available,
    isCombo: Boolean(i.is_combo || isItemInComboStore(i.id)),
    category: i.category || { id: i.category_id, name: "General" },
    station: i.station || null,
    modifierGroups: [],
  }));

  return NextResponse.json(formatted);
}

export async function POST(req: Request) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId") || "demo-branch";
  const body = await req.json();

  const admin = createAdminClient();
  const { data: item, error } = await admin
    .from("menu_items")
    .insert({
      branch_id: branchId,
      category_id: body.categoryId,
      kitchen_station_id: body.stationId || null,
      name: body.name,
      price: body.price,
      half_price: body.halfPrice || null,
      tax_rate_percent: body.taxRatePercent || 5.0,
      is_veg: body.isVeg !== undefined ? body.isVeg : false,
      is_available: body.isActive !== undefined ? body.isActive : true,
      is_combo: body.isCombo !== undefined ? Boolean(body.isCombo) : false,
      image_url: body.imageUrl || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json(item);
}

