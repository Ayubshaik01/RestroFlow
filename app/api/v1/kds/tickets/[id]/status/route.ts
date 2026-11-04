import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSessionUser } from "@/lib/auth/server-session";
import { canTransitionKot, type KotStatusDto } from "@/types/order-lifecycle";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const nextStatus = body.status as KotStatusDto;

  const admin = createAdminClient();

  // Fetch current ticket
  const { data: ticket, error: ticketError } = await admin
    .from("kots")
    .select("id, status")
    .eq("id", id)
    .single();

  if (ticketError || !ticket) {
    return NextResponse.json({ message: "Ticket not found" }, { status: 404 });
  }

  if (ticket.status !== nextStatus && !canTransitionKot(ticket.status as KotStatusDto, nextStatus)) {
    return NextResponse.json(
      { message: `Invalid status transition from ${ticket.status} to ${nextStatus}` },
      { status: 400 },
    );
  }

  const { data: updated, error } = await admin
    .from("kots")
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json(updated);
}

