import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function PATCH(req: Request) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId") || "demo-branch";
  const body = await req.json();

  const admin = createAdminClient();

  const { data: updated, error } = await admin
    .from("branches")
    .update({
      name: body.name,
      address: body.address,
      phone: body.phone,
      gst_number: body.gstNumber,
      country: body.country,
      tax_regime: body.taxRegime,
      tax_mode: body.taxMode,
      tax_label: body.taxLabel,
      tax_id: body.taxId,
      auto_confirm_orders: body.autoConfirmOrders,
      auto_confirm_reservations: body.autoConfirmReservations,
      kiosk_dine_in_enabled: body.kioskDineInEnabled,
      kiosk_takeaway_enabled: body.kioskTakeawayEnabled,
      printer_paper_width_mm: body.printerPaperWidthMm,
      printer_codepage: body.printerCodepage,
      printer_columns: body.printerColumns,
      updated_at: new Date().toISOString(),
    })
    .eq("id", branchId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json(updated);
}

