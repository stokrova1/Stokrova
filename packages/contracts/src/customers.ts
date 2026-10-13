export type CustomerStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type PaymentTerms = 'IMMEDIATE' | 'NET_15' | 'NET_30' | 'NET_60';
export type CustomerAddressType = 'BILLING' | 'SHIPPING' | 'BOTH';

export interface CustomerGroupResponse {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  default_discount_percent_bp: number;
  credit_limit_minor: string;
  payment_terms_days: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerGroupRequest {
  code: string;
  name: string;
  default_discount_percent_bp?: number;
  credit_limit_minor?: string;
  payment_terms_days?: number;
}

export interface CustomerAddressResponse {
  id: string;
  tenant_id: string;
  customer_id: string;
  address_type: CustomerAddressType;
  is_default: boolean;
  street_line_1: string;
  street_line_2: string | null;
  city: string;
  state_province: string | null;
  postal_code: string | null;
  country_code: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerAddressRequest {
  address_type?: CustomerAddressType;
  is_default?: boolean;
  street_line_1: string;
  street_line_2?: string | null;
  city: string;
  state_province?: string | null;
  postal_code?: string | null;
  country_code?: string;
}

export interface CustomerResponse {
  id: string;
  tenant_id: string;
  customer_code: string;
  display_name: string;
  legal_name: string | null;
  email: string | null;
  phone: string | null;
  tax_id: string | null;
  customer_group_id: string | null;
  price_list_id: string | null;
  credit_limit_minor: string;
  outstanding_balance_minor: string;
  payment_terms: PaymentTerms;
  status: CustomerStatus;
  notes: string | null;
  addresses?: CustomerAddressResponse[];
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerRequest {
  customer_code: string;
  display_name: string;
  legal_name?: string | null;
  email?: string | null;
  phone?: string | null;
  tax_id?: string | null;
  customer_group_id?: string | null;
  price_list_id?: string | null;
  credit_limit_minor?: string;
  payment_terms?: PaymentTerms;
  notes?: string | null;
  addresses?: CreateCustomerAddressRequest[];
}

export interface UpdateCustomerRequest {
  display_name?: string;
  legal_name?: string | null;
  email?: string | null;
  phone?: string | null;
  tax_id?: string | null;
  customer_group_id?: string | null;
  price_list_id?: string | null;
  credit_limit_minor?: string;
  payment_terms?: PaymentTerms;
  status?: CustomerStatus;
  notes?: string | null;
}
