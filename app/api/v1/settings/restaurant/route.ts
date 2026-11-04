import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function PATCH(req: Request) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const admin = createAdminClient();

  // If changing allowPublicSignup, enforce that user must be an OWNER
  if (body.allowPublicSignup !== undefined) {
    const isOwner = user.roleName === "OWNER" || user.permissions.includes("*");
    if (!isOwner) {
      return NextResponse.json(
        { message: "Only the restaurant Owner can toggle public registration settings" },
        { status: 403 },
      );
    }
  }

  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (body.name !== undefined) updateData.name = body.name;
  if (body.legalName !== undefined) updateData.legal_name = body.legalName;
  if (body.currency !== undefined) updateData.currency = body.currency;
  if (body.timezone !== undefined) updateData.timezone = body.timezone;
  if (body.upiVpa !== undefined) updateData.upi_vpa = body.upiVpa;
  if (body.upiPayeeName !== undefined) updateData.upi_payee_name = body.upiPayeeName;
  if (body.loyaltyPointValue !== undefined) updateData.loyalty_point_value = body.loyaltyPointValue;
  if (body.loyaltyEarnPerCurrency !== undefined) updateData.loyalty_earn_per_currency = body.loyaltyEarnPerCurrency;
  if (body.allowPublicSignup !== undefined) updateData.allow_public_signup = body.allowPublicSignup;

  const { data: updated, error } = await admin
    .from("restaurants")
    .update(updateData)
    .eq("id", user.restaurantId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json({
    ...updated,
    allowPublicSignup: updated.allow_public_signup ?? false,
  });
}
