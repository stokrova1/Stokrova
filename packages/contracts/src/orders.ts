/**
 * Multi-Channel Sales Orders & Fulfillment Contracts
 * Benchmarked against Odoo Sales, ERPNext Sales Order, and OpenBoxes (Rule 26).
 */

export type SalesChannelType = 'POS' | 'ECOMMERCE' | 'B2B_WHOLESALE' | 'MANUAL';

export type SalesOrderStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'RESERVED'
  | 'PICKING'
  | 'PACKING'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'CANCELLED';

export type OrderPaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'REFUNDED';

export type OrderFulfillmentStatus =
  | 'UNFULFILLED'
  | 'PARTIALLY_FULFILLED'
  | 'FULFILLED';

export interface SalesOrderLineItem {
  id: string;
  order_id: string;
  variant_id: string;
  sku: string;
  product_name: string;
  quantity: number;
  fulfilled_quantity: number;
  unit_price_minor: string;
  discount_minor: string;
  tax_minor: string;
  line_total_minor: string;
}

export interface CreateSalesOrderLineInput {
  variant_id: string;
  quantity: number;
  unit_price_minor: string | number;
  discount_minor?: string | number;
  tax_minor?: string | number;
}

export interface CreateSalesOrderRequest {
  channel_type: SalesChannelType;
  branch_id: string;
  warehouse_id: string;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  shipping_address?: string | null;
  billing_address?: string | null;
  currency_code?: string;
  pos_session_id?: string | null;
  pos_register_id?: string | null;
  lines: CreateSalesOrderLineInput[];
  notes?: string | null;
}

export interface SalesOrderResponse {
  id: string;
  tenant_id: string;
  order_number: string;
  channel_type: SalesChannelType;
  branch_id: string;
  warehouse_id: string;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  shipping_address?: string | null;
  billing_address?: string | null;
  currency_code: string;
  status: SalesOrderStatus;
  payment_status: OrderPaymentStatus;
  fulfillment_status: OrderFulfillmentStatus;
  pos_session_id?: string | null;
  pos_register_id?: string | null;
  subtotal_minor: string;
  total_discount_minor: string;
  total_tax_minor: string;
  grand_total_minor: string;
  amount_paid_minor: string;
  lines: SalesOrderLineItem[];
  notes?: string | null;
  created_at: string;
  updated_at: string;
  confirmed_at?: string | null;
  dispatched_at?: string | null;
  delivered_at?: string | null;
  cancelled_at?: string | null;
}

export interface FulfillOrderLinesRequest {
  fulfillment_items: {
    line_id: string;
    quantity_to_fulfill: number;
  }[];
  tracking_number?: string | null;
  carrier?: string | null;
  notes?: string | null;
}

export interface DispatchSalesOrderRequest {
  tracking_number?: string | null;
  carrier?: string | null;
  notes?: string | null;
}
