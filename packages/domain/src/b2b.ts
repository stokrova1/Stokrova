/**
 * ============================================================================
 * STOKROVA — Enterprise B2B Customer Portal & Credit Limit Domain Engine
 * Phase 16: Enterprise B2B Customer Portal, Self-Service & Credit Underwriting
 *
 * Benchmark: SAP Commerce Cloud (Hybris B2B), NetSuite SuiteCommerce B2B,
 * Salesforce B2B Commerce, OroCommerce Enterprise, cXML 1.2.040 PunchOut
 *
 * Golden Rules Compliance:
 * - Rule 7: Never treat receipts as financial truth
 * - Rule 18: Design for concurrency (deterministic price resolution and state machines)
 * - Rule 19: Durable idempotency on approval transitions and exposure checks
 * - Rule 22: Decoupled pure domain logic (Zero node: imports, runtime-agnostic)
 * - Rule 26: Pure integer arithmetic (minor units for monetary, basis points for discounts)
 * ============================================================================
 */

export type B2bOrganizationRole = 'CORPORATE_HOLDING' | 'SUBSIDIARY' | 'BUYING_CENTER';

export type B2bCreditStatus =
  | 'ACTIVE'
  | 'CREDIT_HOLD'
  | 'SUSPENDED'
  | 'REVIEW_REQUIRED';

export type RequisitionStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'CONVERTED_TO_ORDER'
  | 'CANCELLED';

export interface CreditExposureBreakdown {
  credit_limit_minor: string;
  unpaid_invoices_minor: string;
  pending_orders_minor: string;
  total_exposure_minor: string;
  available_credit_minor: string;
  is_over_limit: boolean;
  is_overdue_hold: boolean;
  status: B2bCreditStatus;
}

export interface VolumeTierBreak {
  min_quantity: number;
  discount_bp?: number;
  unit_price_minor?: string;
}

export interface ResolvedB2bPrice {
  sku: string;
  unit_price_minor: string;
  total_line_minor: string;
  applied_rule: 'CONTRACT_PRICE' | 'VOLUME_TIER' | 'CUSTOMER_GROUP' | 'CATALOG_LIST';
  original_list_price_minor: string;
  discount_amount_minor: string;
  effective_discount_bp: number;
}

export interface PunchoutSetupRequest {
  buyer_cookie: string;
  from_identity: string;
  to_identity: string;
  sender_identity: string;
  shared_secret: string;
  browser_form_post_url: string;
}

export interface PunchoutOrderMessageItem {
  line_number: number;
  sku: string;
  description: string;
  quantity: number;
  unit_price_minor: string;
  uom: string;
}

export interface PunchoutOrderMessage {
  buyer_cookie: string;
  currency: string;
  total_amount_minor: string;
  items: PunchoutOrderMessageItem[];
}

export class B2bDomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'B2bDomainError';
  }
}

// ============================================================================
// 1. Real-Time Credit Limit Underwriting & Exposure Engine (Rule 26)
// ============================================================================

export function calculateCreditExposure(
  creditLimitMinor: string,
  unpaidInvoicesMinor: string,
  pendingOrdersMinor: string,
  overdueDays = 0,
  gracePeriodDays = 30,
): CreditExposureBreakdown {
  const limit = BigInt(creditLimitMinor || '0');
  const unpaid = BigInt(unpaidInvoicesMinor || '0');
  const pending = BigInt(pendingOrdersMinor || '0');

  const totalExposure = unpaid + pending;
  const isOverLimit = totalExposure > limit;
  const isOverdueHold = overdueDays > gracePeriodDays;

  let status: B2bCreditStatus = 'ACTIVE';
  if (isOverdueHold || isOverLimit) {
    status = 'CREDIT_HOLD';
  }

  const diff = limit - totalExposure;
  const availableCredit = status === 'CREDIT_HOLD' || diff <= 0n ? 0n : diff;

  return {
    credit_limit_minor: limit.toString(),
    unpaid_invoices_minor: unpaid.toString(),
    pending_orders_minor: pending.toString(),
    total_exposure_minor: totalExposure.toString(),
    available_credit_minor: availableCredit.toString(),
    is_over_limit: isOverLimit,
    is_overdue_hold: isOverdueHold,
    status,
  };
}

// ============================================================================
// 2. Requisition Approval State Machine & Purchasing Limits
// ============================================================================

export function evaluateRequisitionApprovalRequired(
  totalMinor: string,
  userApprovalLimitMinor?: string,
): {
  requires_approval: boolean;
  status: RequisitionStatus;
} {
  const total = BigInt(totalMinor || '0');
  const limit = userApprovalLimitMinor ? BigInt(userApprovalLimitMinor) : 0n;

  if (limit > 0n && total <= limit) {
    return {
      requires_approval: false,
      status: 'APPROVED',
    };
  }

  return {
    requires_approval: true,
    status: 'PENDING_APPROVAL',
  };
}

export function assertValidRequisitionTransition(
  currentStatus: RequisitionStatus,
  nextStatus: RequisitionStatus,
): void {
  if (currentStatus === nextStatus) {
    return; // Idempotent self-transition (Rule 19)
  }

  const allowedTransitions: Record<RequisitionStatus, RequisitionStatus[]> = {
    DRAFT: ['PENDING_APPROVAL', 'APPROVED', 'CANCELLED'],
    PENDING_APPROVAL: ['APPROVED', 'REJECTED', 'CANCELLED'],
    APPROVED: ['CONVERTED_TO_ORDER', 'CANCELLED'],
    REJECTED: ['DRAFT', 'CANCELLED'],
    CONVERTED_TO_ORDER: [],
    CANCELLED: [],
  };

  const allowed = allowedTransitions[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    throw new B2bDomainError(
      'INVALID_REQUISITION_TRANSITION',
      `Cannot transition requisition from '${currentStatus}' to '${nextStatus}'`,
      { current_status: currentStatus, next_status: nextStatus },
    );
  }
}

// ============================================================================
// 3. Hierarchical Contract Pricing & Quantity Breaks Resolver (Rule 26)
// ============================================================================

export function resolveB2bUnitPrice(params: {
  sku: string;
  quantity: number;
  catalogListPriceMinor: string;
  contractPriceMinor?: string;
  volumeBreaks?: VolumeTierBreak[];
  groupDiscountBp?: number;
}): ResolvedB2bPrice {
  const qty = BigInt(Math.max(1, params.quantity));
  const listPrice = BigInt(params.catalogListPriceMinor || '0');

  // Rule 1: Specific Customer Contract Price
  if (params.contractPriceMinor && params.contractPriceMinor !== '') {
    const contractPrice = BigInt(params.contractPriceMinor);
    const lineTotal = contractPrice * qty;
    const discount = listPrice > contractPrice ? listPrice - contractPrice : 0n;
    const discountBp = listPrice > 0n ? Number((discount * 10000n) / listPrice) : 0;

    return {
      sku: params.sku,
      unit_price_minor: contractPrice.toString(),
      total_line_minor: lineTotal.toString(),
      applied_rule: 'CONTRACT_PRICE',
      original_list_price_minor: listPrice.toString(),
      discount_amount_minor: discount.toString(),
      effective_discount_bp: discountBp,
    };
  }

  // Rule 2: Volume / Quantity Breaks
  if (params.volumeBreaks && params.volumeBreaks.length > 0) {
    // Sort descending by min_quantity to find highest applicable tier
    const eligibleTiers = params.volumeBreaks
      .filter((t) => params.quantity >= t.min_quantity)
      .sort((a, b) => b.min_quantity - a.min_quantity);

    if (eligibleTiers.length > 0) {
      const bestTier = eligibleTiers[0]!;
      let unitPrice = listPrice;

      if (bestTier.unit_price_minor) {
        unitPrice = BigInt(bestTier.unit_price_minor);
      } else if (bestTier.discount_bp && bestTier.discount_bp > 0) {
        const discountAmount = (listPrice * BigInt(bestTier.discount_bp)) / 10000n;
        unitPrice = listPrice - discountAmount;
      }

      const lineTotal = unitPrice * qty;
      const discount = listPrice > unitPrice ? listPrice - unitPrice : 0n;
      const discountBp = listPrice > 0n ? Number((discount * 10000n) / listPrice) : 0;

      return {
        sku: params.sku,
        unit_price_minor: unitPrice.toString(),
        total_line_minor: lineTotal.toString(),
        applied_rule: 'VOLUME_TIER',
        original_list_price_minor: listPrice.toString(),
        discount_amount_minor: discount.toString(),
        effective_discount_bp: discountBp,
      };
    }
  }

  // Rule 3: Customer Group Discount
  if (params.groupDiscountBp && params.groupDiscountBp > 0) {
    const discountAmount = (listPrice * BigInt(params.groupDiscountBp)) / 10000n;
    const unitPrice = listPrice - discountAmount;
    const lineTotal = unitPrice * qty;

    return {
      sku: params.sku,
      unit_price_minor: unitPrice.toString(),
      total_line_minor: lineTotal.toString(),
      applied_rule: 'CUSTOMER_GROUP',
      original_list_price_minor: listPrice.toString(),
      discount_amount_minor: discountAmount.toString(),
      effective_discount_bp: params.groupDiscountBp,
    };
  }

  // Rule 4: Catalog List Price
  return {
    sku: params.sku,
    unit_price_minor: listPrice.toString(),
    total_line_minor: (listPrice * qty).toString(),
    applied_rule: 'CATALOG_LIST',
    original_list_price_minor: listPrice.toString(),
    discount_amount_minor: '0',
    effective_discount_bp: 0,
  };
}

// ============================================================================
// 4. PunchOut Protocol Parser & POSR Serializer (cXML 1.2.040)
// ============================================================================

export function parseCxmlPunchoutSetupRequest(xml: string): PunchoutSetupRequest {
  const getTagValue = (tagName: string): string => {
    const regex = new RegExp(`<${tagName}[^>]*>([^<]+)</${tagName}>`, 'i');
    const match = xml.match(regex);
    return match?.[1]?.trim() ?? '';
  };

  const buyerCookie = getTagValue('BuyerCookie');
  const browserFormPostUrl = getTagValue('URL');
  const sharedSecret = getTagValue('SharedSecret');

  // Identity elements
  const fromMatch = xml.match(/<From>[\s\S]*?<Identity>([^<]+)<\/Identity>[\s\S]*?<\/From>/i);
  const toMatch = xml.match(/<To>[\s\S]*?<Identity>([^<]+)<\/Identity>[\s\S]*?<\/To>/i);
  const senderMatch = xml.match(/<Sender>[\s\S]*?<Identity>([^<]+)<\/Identity>[\s\S]*?<\/Sender>/i);

  if (!buyerCookie) {
    throw new B2bDomainError('INVALID_PUNCHOUT_CXML', 'PunchOutSetupRequest is missing BuyerCookie');
  }

  return {
    buyer_cookie: buyerCookie,
    from_identity: fromMatch?.[1]?.trim() ?? '',
    to_identity: toMatch?.[1]?.trim() ?? '',
    sender_identity: senderMatch?.[1]?.trim() ?? '',
    shared_secret: sharedSecret,
    browser_form_post_url: browserFormPostUrl,
  };
}

export function generateCxmlPunchoutOrderMessage(msg: PunchoutOrderMessage): string {
  const timestamp = new Date().toISOString();
  const totalMajor = (BigInt(msg.total_amount_minor || '0') / 100n).toString();
  const totalCents = (BigInt(msg.total_amount_minor || '0') % 100n).toString().padStart(2, '0');
  const formattedTotal = `${totalMajor}.${totalCents}`;

  let itemsXml = '';
  for (const item of msg.items) {
    const itemPriceMajor = (BigInt(item.unit_price_minor || '0') / 100n).toString();
    const itemPriceCents = (BigInt(item.unit_price_minor || '0') % 100n).toString().padStart(2, '0');
    const formattedPrice = `${itemPriceMajor}.${itemPriceCents}`;

    itemsXml += `
      <ItemIn quantity="${item.quantity}">
        <ItemID>
          <SupplierPartID>${escapeXml(item.sku)}</SupplierPartID>
        </ItemID>
        <ItemDetail>
          <UnitPrice>
            <Money currency="${escapeXml(msg.currency)}">${formattedPrice}</Money>
          </UnitPrice>
          <Description xml:lang="en">${escapeXml(item.description)}</Description>
          <UnitOfMeasure>${escapeXml(item.uom)}</UnitOfMeasure>
        </ItemDetail>
      </ItemIn>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE cXML SYSTEM "http://xml.cxml.org/schemas/cXML/1.2.040/cXML.dtd">
<cXML payloadID="${timestamp}@stokrova.com" timestamp="${timestamp}">
  <Message>
    <PunchOutOrderMessage>
      <BuyerCookie>${escapeXml(msg.buyer_cookie)}</BuyerCookie>
      <PunchOutOrderMessageHeader operationAllowed="create">
        <Total>
          <Money currency="${escapeXml(msg.currency)}">${formattedTotal}</Money>
        </Total>
      </PunchOutOrderMessageHeader>${itemsXml}
    </PunchOutOrderMessage>
  </Message>
</cXML>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
