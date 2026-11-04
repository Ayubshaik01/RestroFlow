import { computeOrderTotals, round2, type PricedLine } from "./pricing";
export { round2 };

export interface BillInput {
  lines: PricedLine[];
  discountPercent?: number;
  discountFlat?: number;
  autoDiscount?: number;
  loyaltyDiscountRequested?: number;
  tip?: number;
  deliveryFee?: number;
}

export interface Bill {
  subtotal: number;
  discountAmount: number;
  discountPercent: number;
  taxAmount: number;
  loyaltyDiscountAmount: number;
  tipAmount: number;
  deliveryFee: number;
  totalDue: number;
}

export function computeBill(input: BillInput): Bill {
  const totals = computeOrderTotals(
    input.lines,
    input.discountPercent ?? 0,
    (input.discountFlat ?? 0) + (input.autoDiscount ?? 0),
  );
  const loyaltyDiscountAmount = round2(
    Math.min(
      Math.max(input.loyaltyDiscountRequested ?? 0, 0),
      totals.totalAmount,
    ),
  );
  const tipAmount = round2(input.tip ?? 0);
  const deliveryFee = round2(input.deliveryFee ?? 0);
  const taxAmount =
    totals.subtotal > 0
      ? round2(
          (totals.taxAmount * (totals.subtotal - totals.discountAmount)) /
            totals.subtotal,
        )
      : 0;
  return {
    subtotal: totals.subtotal,
    discountAmount: totals.discountAmount,
    discountPercent: discountPercentOf(totals.subtotal, totals.discountAmount),
    taxAmount,
    loyaltyDiscountAmount,
    tipAmount,
    deliveryFee,
    totalDue: round2(
      totals.totalAmount - loyaltyDiscountAmount + tipAmount + deliveryFee,
    ),
  };
}

export function discountPercentOf(
  subtotal: number,
  discountAmount: number,
): number {
  if (subtotal <= 0 || discountAmount <= 0) return 0;
  return round2((discountAmount / subtotal) * 100);
}

export function manualDiscountEntry(
  percent: number,
  flat: number,
): { type: "PERCENT" | "FIXED"; value: number } | null {
  if (percent > 0) return { type: "PERCENT", value: round2(percent) };
  if (flat > 0) return { type: "FIXED", value: round2(flat) };
  return null;
}

export interface PaymentLineInput {
  method: string;
  amount: number;
  tendered?: number;
  reference?: string;
}

export interface SettledPayment {
  method: string;
  amount: number;
  tendered: number | null;
  changeGiven: number | null;
  reference?: string;
}

export interface Settlement {
  payments: SettledPayment[];
  paidNow: number;
  balanceAfter: number;
  changeDue: number;
  fullyPaid: boolean;
}

export function settlePayments(args: {
  balance: number;
  payments: PaymentLineInput[];
  giftCardApplied?: number;
  allowPartial?: boolean;
}): Settlement {
  const balance = round2(args.balance);
  const giftCardApplied = round2(args.giftCardApplied ?? 0);

  const lines: SettledPayment[] = args.payments.map((p) => {
    const amount = round2(p.amount);
    if (!(amount > 0)) {
      throw new Error("Each payment must be more than zero");
    }
    if (p.tendered !== undefined) {
      if (p.method !== "CASH") {
        throw new Error("Only a cash payment can have an amount received");
      }
      const tendered = round2(p.tendered);
      if (tendered < amount) {
        throw new Error("The amount received cannot be less than the payment");
      }
      return {
        method: p.method,
        amount,
        tendered,
        changeGiven: round2(tendered - amount),
        reference: p.reference,
      };
    }
    return {
      method: p.method,
      amount,
      tendered: null,
      changeGiven: null,
      reference: p.reference,
    };
  });

  let excess = round2(
    lines.reduce((sum, l) => sum + l.amount, 0) + giftCardApplied - balance,
  );
  if (excess > 0) {
    for (let i = lines.length - 1; i >= 0 && excess > 0; i--) {
      const line = lines[i];
      if (line.method !== "CASH") continue;
      const take = Math.min(excess, line.amount);
      const handedOver = line.tendered ?? line.amount;
      line.amount = round2(line.amount - take);
      line.tendered = handedOver;
      line.changeGiven = round2(handedOver - line.amount);
      excess = round2(excess - take);
    }
    if (excess > 0) {
      throw new Error(
        `Payments exceed the amount due (${balance}) - only cash can be over-tendered`,
      );
    }
  }

  const kept = lines.filter((l) => l.amount > 0);
  const paidNow = round2(
    kept.reduce((sum, l) => sum + l.amount, 0) + giftCardApplied,
  );
  const balanceAfter = round2(balance - paidNow);
  const fullyPaid = balanceAfter <= 0;

  if (!fullyPaid && !args.allowPartial) {
    throw new Error(`Payments (${paidNow}) do not cover the total due (${balance})`);
  }
  if (!fullyPaid && paidNow <= 0) {
    throw new Error("Enter a payment to record");
  }

  return {
    payments: kept,
    paidNow,
    balanceAfter: Math.max(balanceAfter, 0),
    changeDue: round2(kept.reduce((sum, l) => sum + (l.changeGiven ?? 0), 0)),
    fullyPaid,
  };
}

