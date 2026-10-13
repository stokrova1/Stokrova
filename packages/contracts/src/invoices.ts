export type SalesInvoiceStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'VOID'
  | 'CREDITED';

export interface SalesInvoiceLineItem {
  id: string;
  invoice_id: string;
  variant_id: string;
  sku: string;
  product_name: string;
  quantity: number;
  unit_price_minor: string;
  discount_minor: string;
  tax_minor: string;
  line_total_minor: string;
}

export interface SalesInvoiceResponse {
  id: string;
  tenant_id: string;
  invoice_number: string;
  order_id: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  status: SalesInvoiceStatus;
  currency_code: string;
  total_minor: string;
  amount_paid_minor: string;
  balance_due_minor: string;
  due_date: string | null;
  notes: string | null;
  issued_at: string;
  lines?: SalesInvoiceLineItem[];
  created_at: string;
  updated_at: string;
}

export interface CreateSalesInvoiceRequest {
  order_id: string;
  customer_id?: string | null;
  due_date?: string | null;
  notes?: string | null;
}

export interface VoidSalesInvoiceRequest {
  reason: string;
}
