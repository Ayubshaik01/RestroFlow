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

  // Fetch floors for branch
  const { data: floors, error: floorError } = await admin
    .from("floors")
    .select("id, name, sort_order")
    .eq("branch_id", branchId)
    .order("sort_order", { ascending: true });

  if (floorError || !floors || floors.length === 0) {
    // Demo fallback floor with tables
    return NextResponse.json([
      {
        id: "demo-floor-1",
        name: "Ground Floor",
        sortOrder: 0,
        tables: [
          {
            id: "table-1",
            floorId: "demo-floor-1",
            number: "1",
            name: "Table 1",
            capacity: 4,
            status: "AVAILABLE",
            statusSince: new Date().toISOString(),
            posX: 40,
            posY: 40,
            width: 90,
            height: 90,
            rotation: 0,
            shape: "square",
            qrToken: "qr-demo-table-1",
            assignedWaiter: null,
          },
          {
            id: "table-2",
            floorId: "demo-floor-1",
            number: "2",
            name: "Table 2",
            capacity: 4,
            status: "AVAILABLE",
            statusSince: new Date().toISOString(),
            posX: 160,
            posY: 40,
            width: 90,
            height: 90,
            rotation: 0,
            shape: "square",
            qrToken: "qr-demo-table-2",
            assignedWaiter: null,
          },
          {
            id: "table-3",
            floorId: "demo-floor-1",
            number: "3",
            name: "Table 3",
            capacity: 2,
            status: "AVAILABLE",
            statusSince: new Date().toISOString(),
            posX: 280,
            posY: 40,
            width: 80,
            height: 80,
            rotation: 0,
            shape: "round",
            qrToken: "qr-demo-table-3",
            assignedWaiter: null,
          },
        ],
      },
    ]);
  }

  // Fetch tables for these floors
  const floorIds = floors.map((f) => f.id);
  const { data: tables } = await admin
    .from("tables")
    .select(
      "id, floor_id, number, name, capacity, status, status_since, pos_x, pos_y, width, height, rotation, shape, color, qr_token, assigned_waiter_id, users:assigned_waiter_id(id, name)",
    )
    .in("floor_id", floorIds)
    .order("number", { ascending: true });

  const result = floors.map((f) => {
    const floorTables = (tables || [])
      .filter((t) => t.floor_id === f.id)
      .map((t) => ({
        id: t.id,
        floorId: t.floor_id,
        number: t.number,
        name: t.name,
        capacity: t.capacity,
        status: t.status,
        statusSince: t.status_since,
        posX: t.pos_x,
        posY: t.pos_y,
        width: t.width,
        height: t.height,
        rotation: t.rotation,
        shape: t.shape,
        qrToken: t.qr_token,
        assignedWaiter: t.users ? { id: (t.users as any).id, name: (t.users as any).name } : null,
      }));

    return {
      id: f.id,
      name: f.name,
      sortOrder: f.sort_order,
      tables: floorTables,
    };
  });

  return NextResponse.json(result);
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
  const { data: floor, error } = await admin
    .from("floors")
    .insert({
      branch_id: branchId,
      name: body.name,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json(floor);
}

