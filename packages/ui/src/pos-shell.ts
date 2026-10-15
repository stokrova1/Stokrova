/**
 * STOKROVA High-Speed POS Shell Engine & State Descriptors
 * Touch-screen and keyboard-first retail terminal abstractions.
 * Invariants: Pure integer minor arithmetic, decoupled payments.
 */

export interface PosCartItem {
  id: string;
  variantId: string;
  sku: string;
  title: string;
  unitPriceMinor: bigint;
  quantity: number;
  discountMinor: bigint;
  taxMinor: bigint;
  barcode?: string;
}

export interface PosCartSummary {
  subtotalMinor: bigint;
  totalDiscountMinor: bigint;
  totalTaxMinor: bigint;
  grandTotalMinor: bigint;
  itemCount: number;
  totalQuantity: number;
}

export interface PosTenderSplit {
  tenderType: 'CASH' | 'CARD' | 'TRANSFER' | 'STORE_CREDIT' | 'GIFT_CARD';
  amountMinor: bigint;
  reference?: string;
}

export interface PosPaymentCalculation {
  grandTotalMinor: bigint;
  totalTenderedMinor: bigint;
  remainingDueMinor: bigint;
  changeDueMinor: bigint;
  isFullySettled: boolean;
}

export interface PosHardwareStatus {
  printerConnected: boolean;
  scaleWeightGrams?: number | null;
  drawerOpen: boolean;
  scannerReady: boolean;
  lastHeartbeatIso: string;
}

export const POS_QUICK_KEYS = [
  { key: 'F1', label: 'Search Item', action: 'FOCUS_SEARCH' },
  { key: 'F2', label: 'Select Customer', action: 'SELECT_CUSTOMER' },
  { key: 'F4', label: 'Discount', action: 'APPLY_DISCOUNT' },
  { key: 'F7', label: 'Hold Sale', action: 'HOLD_SALE' },
  { key: 'F8', label: 'Recall Sale', action: 'RECALL_SALE' },
  { key: 'F9', label: 'Open Drawer', action: 'KICK_DRAWER' },
  { key: 'F12', label: 'Pay / Tender', action: 'OPEN_PAYMENT' },
  { key: 'Escape', label: 'Cancel Ticket', action: 'CANCEL_TICKET' },
] as const;

/**
 * Calculates cart subtotal, discounts, taxes, and grand total in integer minor units.
 */
export function calculatePosCartSummary(items: PosCartItem[]): PosCartSummary {
  let subtotal = 0n;
  let totalDiscount = 0n;
  let totalTax = 0n;
  let totalQty = 0;

  for (const item of items) {
    const qty = BigInt(Math.max(1, item.quantity));
    const lineGross = item.unitPriceMinor * qty;
    subtotal += lineGross;
    totalDiscount += item.discountMinor;
    totalTax += item.taxMinor;
    totalQty += item.quantity;
  }

  const grandTotal = subtotal - totalDiscount + totalTax;

  return {
    subtotalMinor: subtotal,
    totalDiscountMinor: totalDiscount,
    totalTaxMinor: totalTax,
    grandTotalMinor: grandTotal > 0n ? grandTotal : 0n,
    itemCount: items.length,
    totalQuantity: totalQty,
  };
}

/**
 * Computes split tender settlement, remaining balance due, and cash change return.
 */
export function calculatePosPaymentState(
  grandTotalMinor: bigint,
  tenders: PosTenderSplit[],
): PosPaymentCalculation {
  let totalTendered = 0n;
  for (const t of tenders) {
    totalTendered += t.amountMinor;
  }

  const remainingDue = grandTotalMinor > totalTendered ? grandTotalMinor - totalTendered : 0n;
  const changeDue = totalTendered > grandTotalMinor ? totalTendered - grandTotalMinor : 0n;
  const isFullySettled = totalTendered >= grandTotalMinor;

  return {
    grandTotalMinor,
    totalTenderedMinor: totalTendered,
    remainingDueMinor: remainingDue,
    changeDueMinor: changeDue,
    isFullySettled,
  };
}
