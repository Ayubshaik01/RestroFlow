import type { TaxMode } from "@/types/tax";

export function toEffectiveInclusiveUnitPrice(
  rawUnitPrice: number,
  taxRatePercent: number,
  taxMode: TaxMode,
): number {
  if (taxMode === "EXCLUSIVE" && taxRatePercent > 0) {
    return round2(rawUnitPrice * (1 + taxRatePercent / 100));
  }
  return round2(rawUnitPrice);
}

export interface PricedLineInput {
  quantity: number;
  unitPriceInclusive: number;
  taxRatePercent: number;
}

export interface PricedLine {
  lineTotal: number;
  taxAmount: number;
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function priceLine(input: PricedLineInput): PricedLine {
  const lineTotal = round2(input.unitPriceInclusive * input.quantity);
  const rate = input.taxRatePercent / 100;
  const taxAmount = rate > 0 ? round2(lineTotal - lineTotal / (1 + rate)) : 0;
  return { lineTotal, taxAmount };
}

export interface OrderTotals {
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
}

export function computeOrderTotals(
  lines: PricedLine[],
  discountPercent = 0,
  discountFlat = 0,
): OrderTotals {
  const subtotal = round2(lines.reduce((sum, l) => sum + l.lineTotal, 0));
  const taxAmount = round2(lines.reduce((sum, l) => sum + l.taxAmount, 0));

  const percentDiscount = round2((subtotal * discountPercent) / 100);
  const discountAmount = round2(
    Math.min(percentDiscount + discountFlat, subtotal),
  );

  const totalAmount = round2(subtotal - discountAmount);

  return { subtotal, taxAmount, discountAmount, totalAmount };
}

