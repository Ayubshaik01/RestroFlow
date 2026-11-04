import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ qrToken: string }> },
) {
  const { qrToken } = await params;
  const admin = createAdminClient();

  // Find table by qrToken
  const { data: table, error: tableError } = await admin
    .from("tables")
    .select(
      `
      id,
      number,
      name,
      floors!inner (
        branch_id,
        branches!inner (
          id,
          name,
          restaurants!inner (name, currency)
        )
      )
    `,
    )
    .eq("qr_token", qrToken)
    .maybeSingle();

  if (tableError || !table) {
    return NextResponse.json({ message: "Invalid or inactive table QR" }, { status: 404 });
  }

  const floorData: any = table.floors;
  const branchData: any = floorData?.branches;
  const branchId = branchData?.id;

  // Fetch active categories with menu items
  const { data: categories } = await admin
    .from("menu_categories")
    .select(
      `
      id,
      name,
      sort_order,
      menu_items (
        id,
        name,
        description,
        price,
        is_veg,
        is_available
      )
    `,
    )
    .eq("branch_id", branchId)
    .eq("is_active", true)
    .eq("show_on_website", true)
    .order("sort_order", { ascending: true });

  const formattedCategories = (categories || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    items: (c.menu_items || [])
      .filter((i: any) => i.is_available)
      .map((i: any) => ({
        id: i.id,
        name: i.name,
        description: i.description,
        price: String(i.price),
        isVeg: i.is_veg,
        modifierGroups: [],
      })),
  }));

  return NextResponse.json({
    branchName: branchData?.name || "Main Branch",
    tableName: table.name || `Table ${table.number}`,
    categories: formattedCategories,
  });
}

