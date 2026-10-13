/**
 * Procurement, Suppliers, Purchasing & Receiving Validation Schemas (Phase 4)
 * Zero external runtime dependencies other than Zod.
 * Benchmarked against ERPNext, Odoo, InvenTree, and OpenBoxes (Rule 26).
 */

import { z } from 'zod';

// ==========================================
// 4A: Supplier Schemas
// ==========================================

export const PaymentTermsTypes = [
  'IMMEDIATE',
  'NET_15',
  'NET_30',
  'NET_60',
  'NET_90',
  'CUSTOM',
] as const;
export const PaymentTermsSchema = z.enum(PaymentTermsTypes);

export const SupplierStatuses = ['ACTIVE', 'INACTIVE', 'BLOCKED'] as const;
export const SupplierStatusSchema = z.enum(SupplierStatuses);

const NonNegativeIntegerOrStringSchema = z
  .union([z.string().regex(/^\d+$/), z.number().int().nonnegative()])
  .transform((val) => val.toString());

export const CreateSupplierSchema = z.object({
  name: z.string().trim().min(1, 'Supplier name is required').max(150),
  code: z
    .string()
    .trim()
    .min(2, 'Code must be at least 2 characters')
    .max(50)
    .regex(/^[A-Za-z0-9_-]+$/, 'Code must be alphanumeric with hyphens or underscores'),
  tax_id: z.string().trim().max(50).nullable().optional(),
  currency_code: z.string().trim().length(3).toUpperCase().optional().default('USD'),
  payment_terms: PaymentTermsSchema.optional().default('NET_30'),
  lead_time_days: z.number().int().nonnegative().optional().default(7),
  email: z.string().trim().email().nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  website: z.string().trim().max(255).nullable().optional(),
  billing_address: z.string().trim().max(255).nullable().optional(),
  shipping_address: z.string().trim().max(255).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export const UpdateSupplierSchema = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  tax_id: z.string().trim().max(50).nullable().optional(),
  currency_code: z.string().trim().length(3).toUpperCase().optional(),
  payment_terms: PaymentTermsSchema.optional(),
  lead_time_days: z.number().int().nonnegative().optional(),
  status: SupplierStatusSchema.optional(),
  email: z.string().trim().email().nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  website: z.string().trim().max(255).nullable().optional(),
  billing_address: z.string().trim().max(255).nullable().optional(),
  shipping_address: z.string().trim().max(255).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export const CreateSupplierProductMappingSchema = z.object({
  supplier_id: z.string().min(1, 'supplier_id is required'),
  variant_id: z.string().min(1, 'variant_id is required'),
  supplier_sku: z.string().trim().min(1, 'supplier_sku is required').max(100),
  supplier_product_name: z.string().trim().max(150).nullable().optional(),
  minimum_order_quantity: z.number().int().positive().optional().default(1),
  order_increment_quantity: z.number().int().positive().optional().default(1),
  unit_cost_minor: NonNegativeIntegerOrStringSchema,
  lead_time_days: z.number().int().nonnegative().nullable().optional(),
  is_preferred: z.boolean().optional().default(false),
});

export const UpdateSupplierProductMappingSchema = z.object({
  supplier_sku: z.string().trim().min(1).max(100).optional(),
  supplier_product_name: z.string().trim().max(150).nullable().optional(),
  minimum_order_quantity: z.number().int().positive().optional(),
  order_increment_quantity: z.number().int().positive().optional(),
  unit_cost_minor: NonNegativeIntegerOrStringSchema.optional(),
  lead_time_days: z.number().int().nonnegative().nullable().optional(),
  is_preferred: z.boolean().optional(),
});

// ==========================================
// 4B: Purchase Order Schemas
// ==========================================

export const PurchaseOrderPriorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;
export const PurchaseOrderPrioritySchema = z.enum(PurchaseOrderPriorities);

export const PurchaseOrderStatuses = [
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'ISSUED',
  'PARTIALLY_RECEIVED',
  'RECEIVED',
  'CLOSED',
  'CANCELLED',
] as const;
export const PurchaseOrderStatusSchema = z.enum(PurchaseOrderStatuses);

export const CreatePurchaseOrderLineSchema = z.object({
  variant_id: z.string().min(1, 'variant_id is required'),
  supplier_sku: z.string().trim().max(100).nullable().optional(),
  quantity: z.number().int().positive('Line quantity must be positive'),
  unit_cost_minor: NonNegativeIntegerOrStringSchema,
  tax_rate_basis_points: z.number().int().min(0).max(10000).optional().default(0),
  notes: z.string().trim().max(255).nullable().optional(),
});

export const CreatePurchaseOrderSchema = z.object({
  supplier_id: z.string().min(1, 'supplier_id is required'),
  destination_warehouse_id: z.string().min(1, 'destination_warehouse_id is required'),
  currency_code: z.string().trim().length(3).toUpperCase().optional().default('USD'),
  priority: PurchaseOrderPrioritySchema.optional().default('NORMAL'),
  notes: z.string().trim().max(500).nullable().optional(),
  expected_delivery_date: z.string().datetime().nullable().optional(),
  discount_minor: NonNegativeIntegerOrStringSchema.optional().default('0'),
  lines: z.array(CreatePurchaseOrderLineSchema).min(1, 'PO must contain at least one line item'),
});

export const UpdatePurchaseOrderSchema = z.object({
  destination_warehouse_id: z.string().min(1).optional(),
  priority: PurchaseOrderPrioritySchema.optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  expected_delivery_date: z.string().datetime().nullable().optional(),
  discount_minor: NonNegativeIntegerOrStringSchema.optional(),
  lines: z.array(CreatePurchaseOrderLineSchema).min(1).optional(),
});

export const SubmitPurchaseOrderForApprovalSchema = z.object({
  requested_by: z.string().min(1, 'requested_by is required'),
  notes: z.string().trim().max(500).nullable().optional(),
});

export const ApprovePurchaseOrderSchema = z.object({
  approved_by: z.string().min(1, 'approved_by is required'),
  notes: z.string().trim().max(500).nullable().optional(),
});

export const RejectPurchaseOrderSchema = z.object({
  rejected_by: z.string().min(1, 'rejected_by is required'),
  rejection_reason: z.string().trim().min(1, 'rejection_reason is required').max(500),
});

export const CancelPurchaseOrderSchema = z.object({
  cancellation_reason: z.string().trim().min(1, 'cancellation_reason is required').max(500),
});

// ==========================================
// 4C: Goods Receiving (GRN) Schemas
// ==========================================

export const GoodsReceiptStatuses = ['DRAFT', 'IN_INSPECTION', 'COMPLETED', 'CANCELLED'] as const;
export const GoodsReceiptStatusSchema = z.enum(GoodsReceiptStatuses);

export const CreateGoodsReceiptLineSchema = z.object({
  purchase_order_line_id: z.string().min(1, 'purchase_order_line_id is required'),
  variant_id: z.string().min(1, 'variant_id is required'),
  quantity_received: z.number().int().positive('quantity_received must be positive'),
  quantity_accepted: z.number().int().nonnegative('quantity_accepted cannot be negative'),
  quantity_quarantined: z.number().int().nonnegative().optional().default(0),
  quantity_rejected: z.number().int().nonnegative().optional().default(0),
  quarantine_reason: z.string().trim().max(255).nullable().optional(),
  lot_number: z.string().trim().max(100).nullable().optional(),
  internal_batch_number: z.string().trim().max(100).nullable().optional(),
  expiration_date: z.string().datetime().nullable().optional(),
  serial_numbers: z.array(z.string().trim().min(1)).optional().default([]),
  target_location_id: z.string().min(1, 'target_location_id is required'),
  quarantine_location_id: z.string().nullable().optional(),
  unit_cost_minor: NonNegativeIntegerOrStringSchema.optional().default('0'),
});

export const CreateGoodsReceiptSchema = z.object({
  purchase_order_id: z.string().min(1, 'purchase_order_id is required'),
  destination_warehouse_id: z.string().min(1, 'destination_warehouse_id is required'),
  carrier: z.string().trim().max(100).nullable().optional(),
  tracking_number: z.string().trim().max(100).nullable().optional(),
  received_by: z.string().min(1, 'received_by is required'),
  idempotency_key: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  lines: z.array(CreateGoodsReceiptLineSchema).min(1, 'GRN must have at least one line'),
});

export const InspectGoodsReceiptSchema = z.object({
  inspected_by: z.string().min(1, 'inspected_by is required'),
  notes: z.string().trim().max(500).nullable().optional(),
  line_inspections: z.array(
    z.object({
      goods_receipt_line_id: z.string().min(1),
      quantity_accepted: z.number().int().nonnegative(),
      quantity_quarantined: z.number().int().nonnegative(),
      quantity_rejected: z.number().int().nonnegative(),
      quarantine_reason: z.string().trim().max(255).nullable().optional(),
      quarantine_location_id: z.string().nullable().optional(),
    }),
  ).min(1),
});

// ==========================================
// 4D: Landed Cost Schemas
// ==========================================

export const LandedCostChargeCategories = [
  'FREIGHT',
  'CUSTOMS_DUTY',
  'PORT_HANDLING',
  'INSURANCE',
  'STORAGE',
  'OTHER',
] as const;
export const LandedCostChargeCategorySchema = z.enum(LandedCostChargeCategories);

export const LandedCostAllocationMethods = [
  'BY_VALUE',
  'BY_QUANTITY',
  'BY_WEIGHT',
  'BY_VOLUME',
] as const;
export const LandedCostAllocationMethodSchema = z.enum(LandedCostAllocationMethods);

export const CreateLandedCostChargeSchema = z.object({
  category: LandedCostChargeCategorySchema,
  description: z.string().trim().min(1).max(255),
  amount_minor: NonNegativeIntegerOrStringSchema,
});

export const CreateLandedCostVoucherSchema = z.object({
  goods_receipt_ids: z.array(z.string().min(1)).min(1, 'At least one GRN must be referenced'),
  allocation_method: LandedCostAllocationMethodSchema,
  currency_code: z.string().trim().length(3).toUpperCase().optional().default('USD'),
  notes: z.string().trim().max(500).nullable().optional(),
  charges: z.array(CreateLandedCostChargeSchema).min(1, 'At least one landed charge is required'),
});

// ==========================================
// 4E: 3-Way Matching & Invoicing Schemas
// ==========================================

export const CreatePurchaseInvoiceLineSchema = z.object({
  purchase_order_line_id: z.string().min(1, 'purchase_order_line_id is required'),
  goods_receipt_line_id: z.string().nullable().optional(),
  variant_id: z.string().min(1, 'variant_id is required'),
  quantity_invoiced: z.number().int().positive('Invoiced quantity must be positive'),
  unit_price_minor: NonNegativeIntegerOrStringSchema,
  tax_rate_basis_points: z.number().int().min(0).max(10000).optional().default(0),
});

export const CreatePurchaseInvoiceSchema = z.object({
  invoice_number: z.string().trim().min(1, 'invoice_number is required').max(100),
  supplier_invoice_reference: z.string().trim().min(1, 'supplier_invoice_reference is required').max(100),
  supplier_id: z.string().min(1, 'supplier_id is required'),
  purchase_order_id: z.string().min(1, 'purchase_order_id is required'),
  goods_receipt_id: z.string().nullable().optional(),
  invoice_date: z.string().datetime(),
  due_date: z.string().datetime(),
  currency_code: z.string().trim().length(3).toUpperCase().optional().default('USD'),
  lines: z.array(CreatePurchaseInvoiceLineSchema).min(1, 'Invoice must have at least one line'),
});

export const VerifyThreeWayMatchSchema = z.object({
  tolerance_price_basis_points: z.number().int().min(0).max(10000).optional().default(0),
  tolerance_quantity: z.number().int().min(0).optional().default(0),
});

// ==========================================
// 4F: Purchase Request Schemas
// ==========================================

export const CreatePurchaseRequestLineSchema = z.object({
  variant_id: z.string().min(1, 'variant_id is required'),
  quantity: z.number().int().positive('Quantity must be positive'),
  estimated_unit_cost_minor: NonNegativeIntegerOrStringSchema.optional().default('0'),
  notes: z.string().trim().max(255).nullable().optional(),
});

export const CreatePurchaseRequestSchema = z.object({
  destination_warehouse_id: z.string().min(1, 'destination_warehouse_id is required'),
  branch_id: z.string().nullable().optional(),
  required_by_date: z.string().datetime().nullable().optional(),
  preferred_supplier_id: z.string().nullable().optional(),
  business_justification: z.string().trim().max(500).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  lines: z.array(CreatePurchaseRequestLineSchema).min(1, 'At least one line item required'),
});

export const ApprovePurchaseRequestSchema = z.object({
  approved_by: z.string().min(1, 'approved_by is required'),
  notes: z.string().trim().max(500).nullable().optional(),
});

export const ConvertPurchaseRequestSchema = z.object({
  supplier_id: z.string().min(1, 'supplier_id is required'),
  idempotency_key: z.string().trim().min(1).optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

// ==========================================
// 4G: RFQ & Supplier Quotation Schemas
// ==========================================

export const CreatePurchaseRfqSchema = z.object({
  destination_warehouse_id: z.string().min(1, 'destination_warehouse_id is required'),
  purchase_request_id: z.string().nullable().optional(),
  response_deadline: z.string().datetime().nullable().optional(),
  currency_code: z.string().trim().length(3).toUpperCase().optional().default('USD'),
  notes: z.string().trim().max(500).nullable().optional(),
  lines: z
    .array(
      z.object({
        variant_id: z.string().min(1, 'variant_id is required'),
        quantity: z.number().int().positive('Quantity must be positive'),
        target_unit_cost_minor: NonNegativeIntegerOrStringSchema.nullable().optional(),
        notes: z.string().trim().max(255).nullable().optional(),
      }),
    )
    .min(1, 'At least one RFQ line item required'),
  supplier_ids: z.array(z.string().min(1)).min(1, 'At least one supplier must be invited'),
});

export const CreateSupplierQuotationSchema = z.object({
  supplier_id: z.string().min(1, 'supplier_id is required'),
  supplier_quotation_reference: z.string().trim().min(1).max(100),
  rfq_id: z.string().nullable().optional(),
  currency_code: z.string().trim().length(3).toUpperCase().optional().default('USD'),
  lead_time_days: z.number().int().nonnegative().nullable().optional(),
  valid_until: z.string().datetime().nullable().optional(),
  payment_terms: PaymentTermsSchema.optional().default('NET_30'),
  notes: z.string().trim().max(500).nullable().optional(),
  lines: z
    .array(
      z.object({
        variant_id: z.string().min(1, 'variant_id is required'),
        quantity: z.number().int().positive('Quantity must be positive'),
        unit_cost_minor: NonNegativeIntegerOrStringSchema,
        discount_minor: NonNegativeIntegerOrStringSchema.optional().default('0'),
        tax_rate_basis_points: z.number().int().min(0).max(10000).optional().default(0),
        lead_time_days: z.number().int().nonnegative().nullable().optional(),
        notes: z.string().trim().max(255).nullable().optional(),
      }),
    )
    .min(1, 'At least one quotation line is required'),
});

// ==========================================
// 4H: Supplier Return Schemas
// ==========================================

export const SupplierReturnReasons = [
  'DAMAGED',
  'DEFECTIVE',
  'WRONG_ITEM',
  'EXCESS_DELIVERY',
  'QUALITY_FAIL',
  'EXPIRED',
  'OTHER',
] as const;
export const SupplierReturnReasonSchema = z.enum(SupplierReturnReasons);

export const CreateSupplierReturnLineSchema = z.object({
  goods_receipt_line_id: z.string().nullable().optional(),
  variant_id: z.string().min(1, 'variant_id is required'),
  quantity: z.number().int().positive('Quantity must be positive'),
  unit_cost_minor: NonNegativeIntegerOrStringSchema.optional().default('0'),
  source_location_id: z.string().nullable().optional(),
  reason: z.string().trim().max(255).nullable().optional(),
});

export const CreateSupplierReturnSchema = z.object({
  supplier_id: z.string().min(1, 'supplier_id is required'),
  purchase_order_id: z.string().min(1, 'purchase_order_id is required'),
  goods_receipt_id: z.string().nullable().optional(),
  warehouse_id: z.string().min(1, 'warehouse_id is required'),
  reason: SupplierReturnReasonSchema,
  notes: z.string().trim().max(500).nullable().optional(),
  lines: z.array(CreateSupplierReturnLineSchema).min(1, 'At least one return line is required'),
});

export const AuthorizeSupplierReturnSchema = z.object({
  authorized_by: z.string().min(1, 'authorized_by is required'),
  credit_memo_reference: z.string().trim().max(100).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export const DispatchSupplierReturnSchema = z.object({
  carrier: z.string().trim().max(100).nullable().optional(),
  tracking_number: z.string().trim().max(100).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

// ==========================================
// 4I: Supplier Payment Schemas
// ==========================================

export const SupplierPaymentMethods = [
  'BANK_TRANSFER',
  'CHECK',
  'CASH',
  'CREDIT_ADJUSTMENT',
  'OTHER',
] as const;
export const SupplierPaymentMethodSchema = z.enum(SupplierPaymentMethods);

export const CreateSupplierPaymentAllocationSchema = z.object({
  purchase_invoice_id: z.string().min(1, 'purchase_invoice_id is required'),
  amount_minor: NonNegativeIntegerOrStringSchema,
});

export const CreateSupplierPaymentSchema = z.object({
  supplier_id: z.string().min(1, 'supplier_id is required'),
  amount_minor: NonNegativeIntegerOrStringSchema,
  currency_code: z.string().trim().length(3).toUpperCase().optional().default('USD'),
  payment_method: SupplierPaymentMethodSchema.optional().default('BANK_TRANSFER'),
  reference: z.string().trim().max(100).nullable().optional(),
  idempotency_key: z.string().trim().min(1, 'idempotency_key is required'),
  notes: z.string().trim().max(500).nullable().optional(),
  allocations: z.array(CreateSupplierPaymentAllocationSchema).min(1, 'At least one allocation required'),
});

