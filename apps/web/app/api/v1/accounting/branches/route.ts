import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSessionUser } from "@/lib/auth/server-session";

export async function GET() {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: branches } = await admin
    .from("branches")
    .select("id, name");

  if (!branches || branches.length === 0) {
    return NextResponse.json([]);
  }

  const rows = await Promise.all(
    branches.map(async (b: any) => {
      let ordersCount = 0;
      let salesTotal = 0;
      let openOrders = 0;
      let lowStockItems = 0;
      let inventoryValue = 0;

      try {
        const { data: orders } = await admin
          .from("orders")
          .select("total_amount, status")
          .eq("branch_id", b.id);

        if (orders) {
          orders.forEach((o: any) => {
            if (o.status === "COMPLETED" || o.status === "DELIVERED" || o.status === "PAID") {
              ordersCount++;
              salesTotal += Number(o.total_amount || 0);
            } else if (o.status === "OPEN" || o.status === "PENDING") {
              openOrders++;
            }
          });
        }

        const { data: ingredients } = await admin
          .from("ingredients")
          .select("current_stock, min_stock, cost_per_unit, cost_per_kg")
          .eq("branch_id", b.id);

        if (ingredients) {
          ingredients.forEach((ing: any) => {
            const stock = Number(ing.current_stock || 0);
            const min = Number(ing.min_stock || 0);
            const cost = Number(ing.cost_per_unit || ing.cost_per_kg || 0);
            inventoryValue += stock * cost;
            if (stock <= min) lowStockItems++;
          });
        }
      } catch {
        // fallback safe
      }

      return {
        branchId: b.id,
        name: b.name,
        orders: ordersCount,
        sales: Math.round(salesTotal * 100) / 100,
        openOrders,
        lowStockItems,
        inventoryValue: Math.round(inventoryValue * 100) / 100,
      };
    }),
  );

  return NextResponse.json(rows);
}
