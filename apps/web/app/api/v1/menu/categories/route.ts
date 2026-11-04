import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function GET(req: Request) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId") || "demo-branch";
  const admin = createAdminClient();

  const { data: categories, error } = await admin
    .from("menu_categories")
    .select("id, name, sort_order, is_active, show_on_website, menu_items(count)")
    .eq("branch_id", branchId)
    .order("sort_order", { ascending: true });

  if (error || !categories || categories.length === 0) {
    // Demo fallback categories
    return NextResponse.json([
      {
        id: "cat-starters",
        name: "Starters & Appetizers",
        sortOrder: 1,
        isActive: true,
        showOnWebsite: true,
        _count: { items: 2 },
      },
      {
        id: "cat-mains",
        name: "Main Course",
        sortOrder: 2,
        isActive: true,
        showOnWebsite: true,
        _count: { items: 2 },
      },
      {
        id: "cat-breads",
        name: "Breads & Rice",
        sortOrder: 3,
        isActive: true,
        showOnWebsite: true,
        _count: { items: 2 },
      },
      {
        id: "cat-drinks",
        name: "Beverages",
        sortOrder: 4,
        isActive: true,
        showOnWebsite: true,
        _count: { items: 1 },
      },
      {
        id: "cat-desserts",
        name: "Desserts",
        sortOrder: 5,
        isActive: true,
        showOnWebsite: true,
        _count: { items: 1 },
      },
    ]);
  }

  const formatted = categories.map((c: any) => ({
    id: c.id,
    name: c.name,
    sortOrder: c.sort_order,
    isActive: c.is_active,
    showOnWebsite: c.show_on_website,
    _count: { items: c.menu_items?.[0]?.count || 0 },
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
  const { data: category, error } = await admin
    .from("menu_categories")
    .insert({
      branch_id: branchId,
      name: body.name,
      sort_order: body.sortOrder || 0,
      is_active: body.isActive !== undefined ? body.isActive : true,
      show_on_website: body.showOnWebsite !== undefined ? body.showOnWebsite : true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json(category);
}

