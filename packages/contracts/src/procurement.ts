/**
 * Procurement, Suppliers, Purchasing & Receiving Contracts (Phase 4)
 * Benchmarked against ERPNext, Odoo, InvenTree, and OpenBoxes (Rule 26).
 */

// ==========================================
// 4A: Suppliers & Vendor Management
// ==========================================

export type PaymentTermsType =
  | 'IMMEDIATE'
  | 'NET_15'
  | 'NET_30'
  | 'NET_60'
  | 'NET_90'
  | 'CUSTOM';

export type SupplierStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';

export interface Supplier {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  tax_id: string | null;
  currency_code: string;
  payment_terms: PaymentTermsType;
  lead_time_days: number;
  status: SupplierStatus;
  email: string | null;
  phone: string | null;
  website: string | null;
  billing_address: string | null;
  shipping_address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierRequest {
  name: string;
  code: string;
  tax_id?: string | null;
  currency_code?: string;
  payment_terms?: PaymentTermsType;
  lead_time_days?: number;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  billing_address?: string | null;
  shipping_address?: string | null;
  notes?: string | null;
}

export interface UpdateSupplierRequest {
  name?: string;
  tax_id?: string | null;
  currency_code?: string;
  payment_terms?: PaymentTermsType;
  lead_time_days?: number;
  status?: SupplierStatus;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  billing_address?: string | null;
  shipping_address?: string | null;
  notes?: string | null;
}

export interface SupplierResponse {
  supplier: Supplier;
}

export interface ListSuppliersResponse {
  suppliers: Supplier[];
}

export interface SupplierProductMapping {
  id: string;
  tenant_id: string;
  supplier_id: string;
  variant_id: string;
  supplier_sku: string;
  supplier_product_name: string | null;
  minimum_order_quantity: number;
  order_increment_quantity: number;
  unit_cost_minor: string;
  lead_time_days: number | null;
  is_preferred: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierProductMappingRequest {
  supplier_id: string;
  variant_id: string;
  supplier_sku: string;
  supplier_product_name?: string | null;
  minimum_order_quantity?: number;
  order_increment_quantity?: number;
  unit_cost_minor: string | number;
  lead_time_days?: number | null;
  is_preferred?: boolean;
}

export interface UpdateSupplierProductMappingRequest {
  supplier_sku?: string;
  supplier_product_name?: string | null;
  minimum_order_quantity?: number;
  order_increment_quantity?: number;
  unit_cost_minor?: string | number;
  lead_time_days?: number | null;
  is_preferred?: boolean;
}

export interface SupplierProductMappingResponse {
  mapping: SupplierProductMapping;
}

export interface ListSupplierProductMappingsResponse {
  mappings: SupplierProductMapping[];
}

export interface SupplierPerformanceMetrics {
  supplier_id: string;
  total_orders_placed: number;
  total_orders_received: number;
  on_time_delivery_rate_basis_points: number; // e.g. 9500 = 95.00%
  average_lead_time_days: number;
}

// ==========================================
// 4B: Purchase Order (PO) Lifecycle & Approvals
// ==========================================

export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'ISSUED'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'CLOSED'
  | 'CANCELLED';

export type PurchaseOrderPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface PurchaseOrderLine {
  id: string;
  tenant_id: string;
  purchase_order_id: string;
  line_number: number;
  variant_id: string;
  supplier_sku: string | null;
  quantity: number;
  received_quantity: number;
  billed_quantity: number;
  unit_cost_minor: string;
  tax_rate_basis_points: number;
  line_subtotal_minor: string;
  line_tax_minor: string;
  line_total_minor: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrder {
  id: string;
  tenant_id: string;
  po_number: string;
  supplier_id: string;
  destination_warehouse_id: string;
  status: PurchaseOrderStatus;
  priority: PurchaseOrderPriority;
  currency_code: string;
  subtotal_minor: string;
  tax_minor: string;
  discount_minor: string;
  total_minor: string;
  notes: string | null;
  expected_delivery_date: string | null;
  approved_by: string | null;
  approved_at: string | null;
  issued_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  lines?: PurchaseOrderLine[];
}

export interface CreatePurchaseOrderLineRequest {
  variant_id: string;
  supplier_sku?: string | null;
  quantity: number;
  unit_cost_minor: string | number;
  tax_rate_basis_points?: number;
  notes?: string | null;
}

export interface CreatePurchaseOrderRequest {
  supplier_id: string;
  destination_warehouse_id: string;
  currency_code?: string;
  priority?: PurchaseOrderPriority;
  notes?: string | null;
  expected_delivery_date?: string | null;
  discount_minor?: string | number;
  lines: CreatePurchaseOrderLineRequest[];
}

export interface UpdatePurchaseOrderRequest {
  destination_warehouse_id?: string;
  priority?: PurchaseOrderPriority;
  notes?: string | null;
  expected_delivery_date?: string | null;
  discount_minor?: string | number;
  lines?: CreatePurchaseOrderLineRequest[];
}

export interface SubmitPurchaseOrderForApprovalRequest {
  requested_by: string;
  notes?: string | null;
}

export interface ApprovePurchaseOrderRequest {
  approved_by: string;
  notes?: string | null;
}

export interface RejectPurchaseOrderRequest {
  rejected_by: string;
  rejection_reason: string;
}

export interface CancelPurchaseOrderRequest {
  cancellation_reason: string;
}

export interface PurchaseOrderResponse {
  order: PurchaseOrder;
}

export interface ListPurchaseOrdersResponse {
  orders: PurchaseOrder[];
}

// ==========================================
// 4C: Goods Receiving (GRN) & Quarantine
// ==========================================

export type GoodsReceiptStatus = 'DRAFT' | 'IN_INSPECTION' | 'COMPLETED' | 'CANCELLED';

export interface GoodsReceiptLine {
  id: string;
  tenant_id: string;
  goods_receipt_id: string;
  purchase_order_line_id: string;
  variant_id: string;
  quantity_received: number;
  quantity_accepted: number;
  quantity_quarantined: number;
  quantity_rejected: number;
  quarantine_reason: string | null;
  lot_number: string | null;
  internal_batch_number: string | null;
  expiration_date: string | null;
  serial_numbers: string[];
  target_location_id: string;
  quarantine_location_id: string | null;
  unit_cost_minor: string;
  created_at: string;
  updated_at: string;
}

export interface GoodsReceiptNote {
  id: string;
  tenant_id: string;
  grn_number: string;
  purchase_order_id: string;
  supplier_id: string;
  destination_warehouse_id: string;
  status: GoodsReceiptStatus;
  carrier: string | null;
  tracking_number: string | null;
  received_by: string;
  received_at: string;
  inspected_by: string | null;
  inspected_at: string | null;
  notes: string | null;
  idempotency_key?: string | null;
  created_at: string;
  updated_at: string;
  lines?: GoodsReceiptLine[];
}

export interface CreateGoodsReceiptLineRequest {
  purchase_order_line_id: string;
  variant_id: string;
  quantity_received: number;
  quantity_accepted: number;
  quantity_quarantined?: number;
  quantity_rejected?: number;
  quarantine_reason?: string | null;
  lot_number?: string | null;
  internal_batch_number?: string | null;
  expiration_date?: string | null;
  serial_numbers?: string[];
  target_location_id: string;
  quarantine_location_id?: string | null;
  unit_cost_minor?: string | number;
}

export interface CreateGoodsReceiptRequest {
  purchase_order_id: string;
  destination_warehouse_id: string;
  carrier?: string | null;
  tracking_number?: string | null;
  received_by: string;
  idempotency_key?: string;
  notes?: string | null;
  lines: CreateGoodsReceiptLineRequest[];
}

export interface InspectGoodsReceiptRequest {
  inspected_by: string;
  notes?: string | null;
  line_inspections: {
    goods_receipt_line_id: string;
    quantity_accepted: number;
    quantity_quarantined: number;
    quantity_rejected: number;
    quarantine_reason?: string | null;
    quarantine_location_id?: string | null;
  }[];
}

export interface GoodsReceiptResponse {
  receipt: GoodsReceiptNote;
}

export interface ListGoodsReceiptsResponse {
  receipts: GoodsReceiptNote[];
}

// ==========================================
// 4D: Landed Cost Allocation Engine
// ==========================================

export type LandedCostChargeCategory =
  | 'FREIGHT'
  | 'CUSTOMS_DUTY'
  | 'PORT_HANDLING'
  | 'INSURANCE'
  | 'STORAGE'
  | 'OTHER';

export type LandedCostAllocationMethod =
  | 'BY_VALUE'
  | 'BY_QUANTITY'
  | 'BY_WEIGHT'
  | 'BY_VOLUME';

export type LandedCostVoucherStatus = 'DRAFT' | 'POSTED' | 'CANCELLED';

export interface LandedCostCharge {
  id: string;
  tenant_id: string;
  voucher_id: string;
  category: LandedCostChargeCategory;
  description: string;
  amount_minor: string;
}

export interface LandedCostLineAllocation {
  id: string;
  tenant_id: string;
  voucher_id: string;
  goods_receipt_line_id: string;
  variant_id: string;
  received_quantity: number;
  original_line_cost_minor: string;
  allocated_charge_minor: string;
  final_line_cost_minor: string;
  unit_landed_cost_minor: string;
}

export interface LandedCostVoucher {
  id: string;
  tenant_id: string;
  voucher_number: string;
  goods_receipt_ids: string[];
  allocation_method: LandedCostAllocationMethod;
  total_charges_minor: string;
  currency_code: string;
  status: LandedCostVoucherStatus;
  notes: string | null;
  posted_by: string | null;
  posted_at: string | null;
  created_at: string;
  updated_at: string;
  charges?: LandedCostCharge[];
  allocations?: LandedCostLineAllocation[];
}

export interface CreateLandedCostChargeRequest {
  category: LandedCostChargeCategory;
  description: string;
  amount_minor: string | number;
}

export interface CreateLandedCostVoucherRequest {
  goods_receipt_ids: string[];
  allocation_method: LandedCostAllocationMethod;
  currency_code?: string;
  notes?: string | null;
  charges: CreateLandedCostChargeRequest[];
}

export interface LandedCostVoucherResponse {
  voucher: LandedCostVoucher;
}

export interface ListLandedCostVouchersResponse {
  vouchers: LandedCostVoucher[];
}

// ==========================================
// 4E: 3-Way Matching & Purchase Invoicing
// ==========================================

export type ThreeWayMatchStatus =
  | 'PERFECT_MATCH'
  | 'TOLERANCE_ACCEPTED'
  | 'DISCREPANCY_FLAGGED'
  | 'REJECTED';

export type PurchaseInvoiceStatus =
  | 'DRAFT'
  | 'MATCHED'
  | 'DISCREPANCY'
  | 'APPROVED'
  | 'PAID'
  | 'CANCELLED';

export interface PurchaseInvoiceLine {
  id: string;
  tenant_id: string;
  invoice_id: string;
  purchase_order_line_id: string;
  goods_receipt_line_id: string | null;
  variant_id: string;
  quantity_invoiced: number;
  unit_price_minor: string;
  tax_rate_basis_points: number;
  line_subtotal_minor: string;
  line_tax_minor: string;
  line_total_minor: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseInvoice {
  id: string;
  tenant_id: string;
  invoice_number: string;
  supplier_invoice_reference: string;
  supplier_id: string;
  purchase_order_id: string;
  goods_receipt_id: string | null;
  invoice_date: string;
  due_date: string;
  status: PurchaseInvoiceStatus;
  match_status: ThreeWayMatchStatus;
  currency_code: string;
  subtotal_minor: string;
  tax_minor: string;
  total_minor: string;
  amount_paid_minor?: string;
  price_variance_minor: string;
  quantity_variance: number;
  discrepancy_notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  lines?: PurchaseInvoiceLine[];
}

export interface CreatePurchaseInvoiceLineRequest {
  purchase_order_line_id: string;
  goods_receipt_line_id?: string | null;
  variant_id: string;
  quantity_invoiced: number;
  unit_price_minor: string | number;
  tax_rate_basis_points?: number;
}

export interface CreatePurchaseInvoiceRequest {
  invoice_number: string;
  supplier_invoice_reference: string;
  supplier_id: string;
  purchase_order_id: string;
  goods_receipt_id?: string | null;
  invoice_date: string;
  due_date: string;
  currency_code?: string;
  lines: CreatePurchaseInvoiceLineRequest[];
}

export interface VerifyThreeWayMatchRequest {
  tolerance_price_basis_points?: number; // e.g., 50 = 0.5%
  tolerance_quantity?: number;
}

export interface ThreeWayMatchResult {
  match_status: ThreeWayMatchStatus;
  price_variance_minor: string;
  quantity_variance: number;
  is_within_tolerance: boolean;
  discrepancies: {
    line_index: number;
    po_quantity: number;
    grn_quantity: number;
    invoiced_quantity: number;
    po_unit_cost_minor: string;
    invoiced_unit_cost_minor: string;
    price_variance_minor: string;
    quantity_variance: number;
    reason: string;
  }[];
}

export interface PurchaseInvoiceResponse {
  invoice: PurchaseInvoice;
}

export interface ListPurchaseInvoicesResponse {
  invoices: PurchaseInvoice[];
}

// ==========================================
// 4F: Purchase Requests (Internal Requisitions)
// ==========================================

export type PurchaseRequestStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'CONVERTED';

export interface PurchaseRequestLine {
  id: string;
  tenant_id: string;
  request_id: string;
  line_number: number;
  variant_id: string;
  quantity: number;
  estimated_unit_cost_minor: string;
  estimated_line_total_minor: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseRequest {
  id: string;
  tenant_id: string;
  request_number: string;
  requested_by: string;
  branch_id: string | null;
  destination_warehouse_id: string;
  status: PurchaseRequestStatus;
  required_by_date: string | null;
  estimated_total_minor: string;
  preferred_supplier_id: string | null;
  business_justification: string | null;
  notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  converted_purchase_order_id: string | null;
  created_at: string;
  updated_at: string;
  lines?: PurchaseRequestLine[];
}

export interface CreatePurchaseRequestLineInput {
  variant_id: string;
  quantity: number;
  estimated_unit_cost_minor?: string | number;
  notes?: string | null;
}

export interface CreatePurchaseRequestInput {
  destination_warehouse_id: string;
  branch_id?: string | null;
  required_by_date?: string | null;
  preferred_supplier_id?: string | null;
  business_justification?: string | null;
  notes?: string | null;
  lines: CreatePurchaseRequestLineInput[];
}

export interface ApprovePurchaseRequestInput {
  approved_by: string;
  notes?: string | null;
}

export interface ConvertPurchaseRequestInput {
  supplier_id: string;
  idempotency_key?: string;
  notes?: string | null;
}

// ==========================================
// 4G: RFQs & Supplier Quotations
// ==========================================

export type PurchaseRfqStatus = 'DRAFT' | 'ISSUED' | 'CLOSED' | 'CANCELLED';

export interface PurchaseRfqLine {
  id: string;
  tenant_id: string;
  rfq_id: string;
  line_number: number;
  variant_id: string;
  quantity: number;
  target_unit_cost_minor: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseRfqSupplier {
  id: string;
  tenant_id: string;
  rfq_id: string;
  supplier_id: string;
  status: 'INVITED' | 'QUOTED' | 'DECLINED';
  invited_at: string;
  responded_at: string | null;
}

export interface PurchaseRfq {
  id: string;
  tenant_id: string;
  rfq_number: string;
  purchase_request_id: string | null;
  destination_warehouse_id: string;
  status: PurchaseRfqStatus;
  response_deadline: string | null;
  currency_code: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  lines?: PurchaseRfqLine[];
  suppliers?: PurchaseRfqSupplier[];
}

export interface CreatePurchaseRfqInput {
  destination_warehouse_id: string;
  purchase_request_id?: string | null;
  response_deadline?: string | null;
  currency_code?: string;
  notes?: string | null;
  lines: {
    variant_id: string;
    quantity: number;
    target_unit_cost_minor?: string | number | null;
    notes?: string | null;
  }[];
  supplier_ids: string[];
}

export type SupplierQuotationStatus =
  | 'RECEIVED'
  | 'UNDER_REVIEW'
  | 'SELECTED'
  | 'REJECTED'
  | 'EXPIRED';

export interface SupplierQuotationLine {
  id: string;
  tenant_id: string;
  quotation_id: string;
  line_number: number;
  variant_id: string;
  quantity: number;
  unit_cost_minor: string;
  discount_minor: string;
  tax_rate_basis_points: number;
  line_total_minor: string;
  lead_time_days: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupplierQuotation {
  id: string;
  tenant_id: string;
  quotation_number: string;
  supplier_quotation_reference: string;
  supplier_id: string;
  rfq_id: string | null;
  status: SupplierQuotationStatus;
  currency_code: string;
  subtotal_minor: string;
  tax_minor: string;
  total_minor: string;
  lead_time_days: number | null;
  valid_until: string | null;
  payment_terms: PaymentTermsType;
  notes: string | null;
  selected_at: string | null;
  converted_purchase_order_id: string | null;
  created_at: string;
  updated_at: string;
  lines?: SupplierQuotationLine[];
}

export interface CreateSupplierQuotationInput {
  supplier_id: string;
  supplier_quotation_reference: string;
  rfq_id?: string | null;
  currency_code?: string;
  lead_time_days?: number | null;
  valid_until?: string | null;
  payment_terms?: PaymentTermsType;
  notes?: string | null;
  lines: {
    variant_id: string;
    quantity: number;
    unit_cost_minor: string | number;
    discount_minor?: string | number;
    tax_rate_basis_points?: number;
    lead_time_days?: number | null;
    notes?: string | null;
  }[];
}

export interface SupplierQuotationComparisonLine {
  quotation_id: string;
  quotation_number: string;
  supplier_id: string;
  supplier_name: string;
  total_minor: string;
  lead_time_days: number | null;
  payment_terms: string;
  is_valid: boolean;
  score: number; // 0 - 100 based on price and lead time
}

export interface SupplierQuotationComparisonResult {
  rfq_id?: string | null;
  comparisons: SupplierQuotationComparisonLine[];
  recommended_quotation_id: string | null;
}

// ==========================================
// 4H: Supplier Returns (Debit Notes / Returns)
// ==========================================

export type SupplierReturnStatus =
  | 'DRAFT'
  | 'AUTHORIZED'
  | 'DISPATCHED'
  | 'COMPLETED'
  | 'CANCELLED';

export type SupplierReturnReason =
  | 'DAMAGED'
  | 'DEFECTIVE'
  | 'WRONG_ITEM'
  | 'EXCESS_DELIVERY'
  | 'QUALITY_FAIL'
  | 'EXPIRED'
  | 'OTHER';

export interface SupplierReturnLine {
  id: string;
  tenant_id: string;
  return_id: string;
  goods_receipt_line_id: string | null;
  variant_id: string;
  quantity: number;
  unit_cost_minor: string;
  line_total_minor: string;
  source_location_id?: string | null;
  reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupplierReturn {
  id: string;
  tenant_id: string;
  return_number: string;
  supplier_id: string;
  purchase_order_id: string;
  goods_receipt_id: string | null;
  warehouse_id: string;
  status: SupplierReturnStatus;
  reason: SupplierReturnReason;
  dispatched_at: string | null;
  authorized_by: string | null;
  authorized_at: string | null;
  carrier: string | null;
  tracking_number: string | null;
  credit_memo_reference: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  lines?: SupplierReturnLine[];
}

export interface CreateSupplierReturnLineInput {
  goods_receipt_line_id?: string | null;
  variant_id: string;
  quantity: number;
  unit_cost_minor?: string | number;
  source_location_id?: string | null;
  reason?: string | null;
}

export interface CreateSupplierReturnInput {
  supplier_id: string;
  purchase_order_id: string;
  goods_receipt_id?: string | null;
  warehouse_id: string;
  reason: SupplierReturnReason;
  notes?: string | null;
  lines: CreateSupplierReturnLineInput[];
}

export interface AuthorizeSupplierReturnInput {
  authorized_by: string;
  credit_memo_reference?: string | null;
  notes?: string | null;
}

export interface DispatchSupplierReturnInput {
  carrier?: string | null;
  tracking_number?: string | null;
  notes?: string | null;
}

// ==========================================
// 4I: Supplier Payments & Allocations
// ==========================================

export type SupplierPaymentMethod =
  | 'BANK_TRANSFER'
  | 'CHECK'
  | 'CASH'
  | 'CREDIT_ADJUSTMENT'
  | 'OTHER';

export type SupplierPaymentStatus = 'PENDING' | 'DISBURSED' | 'FAILED' | 'CANCELLED';

export interface SupplierPaymentAllocation {
  id: string;
  tenant_id: string;
  payment_id: string;
  purchase_invoice_id: string;
  allocated_amount_minor: string;
  created_at: string;
}

export interface SupplierPayment {
  id: string;
  tenant_id: string;
  payment_number: string;
  supplier_id: string;
  amount_minor: string;
  currency_code: string;
  payment_method: SupplierPaymentMethod;
  status: SupplierPaymentStatus;
  disbursed_at: string;
  reference: string | null;
  idempotency_key: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  allocations?: SupplierPaymentAllocation[];
}

export interface CreateSupplierPaymentAllocationInput {
  purchase_invoice_id: string;
  amount_minor: string | number;
}

export interface CreateSupplierPaymentInput {
  supplier_id: string;
  amount_minor: string | number;
  currency_code?: string;
  payment_method?: SupplierPaymentMethod;
  reference?: string | null;
  idempotency_key: string;
  notes?: string | null;
  allocations: CreateSupplierPaymentAllocationInput[];
}

