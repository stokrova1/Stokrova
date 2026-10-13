export type QuotationStatus =
  | 'DRAFT'
  | 'SENT'
  | 'ACCEPTED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'CONVERTED';

export interface QuotationLineItem {
  id: string;
  quotation_id: string;
  variant_id: string;
  sku: string;
  product_name: string;
  quantity: number;
  unit_price_minor: string;
  discount_minor: string;
  tax_minor: string;
  line_total_minor: string;
}

export interface QuotationResponse {
  id: string;
  tenant_id: string;
  quotation_number: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  branch_id: string;
  warehouse_id: string;
  status: QuotationStatus;
  converted_sales_order_id: string | null;
  currency_code: string;
  valid_until: string | null;
  subtotal_minor: string;
  total_discount_minor: string;
  total_tax_minor: string;
  grand_total_minor: string;
  lines: QuotationLineItem[];
  notes: string | null;
  created_at: string;
  updated_at: string;
  converted_at: string | null;
}

export interface CreateQuotationLineInput {
  variant_id: string;
  quantity: number;
  unit_price_minor?: string;
  discount_minor?: string;
  tax_minor?: string;
}

export interface CreateQuotationRequest {
  customer_id?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  branch_id: string;
  warehouse_id: string;
  valid_until?: string | null;
  currency_code?: string;
  lines: CreateQuotationLineInput[];
  notes?: string | null;
}

export interface UpdateQuotationRequest {
  customer_id?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  valid_until?: string | null;
  lines?: CreateQuotationLineInput[];
  notes?: string | null;
}

export interface ConvertQuotationRequest {
  idempotency_key?: string;
  notes?: string | null;
}
