import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json([
    "Order",
    "Table",
    "MenuItem",
    "User",
    "Reservation",
    "Payment",
    "Ingredient",
  ]);
}

