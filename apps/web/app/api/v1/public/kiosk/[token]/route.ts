import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: branch } = await admin
    .from("branches")
    .select(
      `
      id,
      name,
      country,
      tax_mode,
      tax_label,
      kiosk_dine_in_enabled,
      kiosk_takeaway_enabled,
      restaurants!inner (
        name,
        currency,
        logo_url
      )
    `,
    )
    .eq("kiosk_token", token)
    .maybeSingle();

  if (!branch) {
    return NextResponse.json({ message: "Kiosk not found or disabled" }, { status: 404 });
  }

  const restaurant: any = branch.restaurants;

  // Fetch categories with available items
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
        image_url,
        price,
        tax_rate_percent,
        is_veg,
        is_available
      )
    `,
    )
    .eq("branch_id", branch.id)
    .eq("is_active", true)
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
        imageUrl: i.image_url,
        price: String(i.price),
        taxRatePercent: String(i.tax_rate_percent),
        isVeg: i.is_veg,
        modifierGroups: [],
      })),
  }));

  return NextResponse.json({
    restaurantName: restaurant?.name || "OrderRestro",
    branchName: branch.name,
    logoUrl: restaurant?.logo_url || null,
    currency: restaurant?.currency || "INR",
    country: branch.country || "IN",
    taxMode: branch.tax_mode || "INCLUSIVE",
    taxLabel: branch.tax_label || "GST",
    services: {
      dineIn: branch.kiosk_dine_in_enabled,
      takeaway: branch.kiosk_takeaway_enabled,
    },
    categories: formattedCategories,
  });
}

