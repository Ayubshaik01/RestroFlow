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

  const { data: restaurant } = await admin
    .from("restaurants")
    .select("*")
    .eq("id", user.restaurantId)
    .maybeSingle();

  const { data: branch } = await admin
    .from("branches")
    .select("*")
    .eq("id", branchId)
    .maybeSingle();

  return NextResponse.json({
    restaurant: {
      id: restaurant?.id || user.restaurantId,
      name: restaurant?.name || "RestroFlow Bistro",
      legalName: restaurant?.legal_name || null,
      logoUrl: restaurant?.logo_url || null,
      currency: restaurant?.currency || "INR",
      timezone: restaurant?.timezone || "Asia/Kolkata",
      upiVpa: restaurant?.upi_vpa || null,
      upiPayeeName: restaurant?.upi_payee_name || null,
      loyaltyPointValue: String(restaurant?.loyalty_point_value || 1.0),
      loyaltyEarnPerCurrency: restaurant?.loyalty_earn_per_currency || 100,
      allowPublicSignup: restaurant?.allow_public_signup ?? false,
    },
    branch: {
      id: branch?.id || branchId,
      name: branch?.name || "Main Branch",
      address: branch?.address || "",
      phone: branch?.phone || "",
      gstNumber: branch?.gst_number || "",
      country: branch?.country || "IN",
      taxRegime: branch?.tax_regime || "INDIA_GST",
      taxMode: branch?.tax_mode || "INCLUSIVE",
      taxLabel: branch?.tax_label || "GST",
      taxId: branch?.tax_id || branch?.gst_number || "",
      autoConfirmOrders: branch?.auto_confirm_orders ?? true,
      autoConfirmReservations: branch?.auto_confirm_reservations ?? true,
      kioskToken: branch?.kiosk_token || null,
      kioskDineInEnabled: branch?.kiosk_dine_in_enabled ?? true,
      kioskTakeawayEnabled: branch?.kiosk_takeaway_enabled ?? true,
      printerPaperWidthMm: branch?.printer_paper_width_mm || 80,
      printerCodepage: branch?.printer_codepage || "CP437",
      printerColumns: branch?.printer_columns || 48,
      printerConnection: branch?.printer_connection || "USB",
      printerHost: branch?.printer_host || null,
      printerPort: branch?.printer_port || 9100,
    },
  });
}
