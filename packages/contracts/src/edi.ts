/**
 * ============================================================================
 * STOKROVA — Supply Chain EDI Engine & Automated B2B Exchange Contracts
 * Phase 18: Supply Chain EDI Engine (ANSI X12 & UN/EDIFACT)
 * ============================================================================
 */

export type EdiStandard = 'ANSI_X12' | 'UN_EDIFACT';

export type EdiTransactionType =
  // ANSI X12
  | '850' // Purchase Order (Inbound)
  | '855' // Purchase Order Acknowledgment (Outbound)
  | '856' // Ship Notice / Manifest / ASN (Outbound)
  | '810' // Invoice (Outbound)
  | '997' // Functional Acknowledgment (Bidirectional)
  // UN/EDIFACT
  | 'ORDERS' // Purchase Order
  | 'ORDRSP' // Purchase Order Response
  | 'DESADV' // Despatch Advice
  | 'INVOIC' // Commercial Invoice
  | 'CONTRL'; // Syntax / Functional Acknowledgment

export type EdiDirection = 'INBOUND' | 'OUTBOUND';

export type EdiMessageStatus =
  | 'RECEIVED'
  | 'PARSED'
  | 'PROCESSED'
  | 'GENERATED'
  | 'TRANSMITTED'
  | 'ACKNOWLEDGED'
  | 'REJECTED'
  | 'FAILED';

export interface EdiInterchangeEnvelope {
  sender_id: string;
  sender_qualifier: string;
  receiver_id: string;
  receiver_qualifier: string;
  control_number: string;
  date: string;
  time: string;
  standard: EdiStandard;
  version: string;
}

export interface EdiPurchaseOrderLine {
  line_number: string;
  sku: string;
  gtin_upc?: string | null;
  description: string;
  quantity: number;
  unit_price_minor: string;
  uom: string;
}

export interface EdiPurchaseOrder {
  po_number: string;
  po_date: string;
  buyer_name: string;
  buyer_id: string;
  supplier_id?: string | null;
  currency: string;
  total_amount_minor: string;
  lines: EdiPurchaseOrderLine[];
}

export interface EdiPurchaseOrderAckLine {
  line_number: string;
  sku: string;
  status: 'IA' | 'IR' | 'IP' | 'IQ'; // Item Accepted, Item Rejected, Item Backordered, Quantity Changed
  quantity_acknowledged: number;
  unit_price_minor: string;
}

export interface EdiPurchaseOrderAck {
  po_number: string;
  ack_type: 'ACCEPTED' | 'REJECTED' | 'MODIFIED';
  ack_date: string;
  lines: EdiPurchaseOrderAckLine[];
}

export interface EdiAsnItem {
  sku: string;
  quantity: number;
  uom: string;
  lot_number?: string | null;
  serial_numbers?: string[] | null;
}

export interface EdiPallet {
  sscc_18: string;
  tare_weight_grams?: number;
  items: EdiAsnItem[];
}

export interface EdiAdvanceShipNotice {
  shipment_id: string;
  bol_number: string;
  ship_date: string;
  estimated_delivery_date?: string;
  carrier_code: string; // SCAC code e.g. UPSN, FDEG, CHNW
  tracking_number: string;
  pallets: EdiPallet[];
}

export interface EdiInvoiceLine {
  line_number: string;
  sku: string;
  description: string;
  quantity: number;
  unit_price_minor: string;
  line_total_minor: string;
}

export interface EdiInvoice {
  invoice_number: string;
  po_number: string;
  invoice_date: string;
  currency: string;
  subtotal_minor: string;
  tax_minor: string;
  total_minor: string;
  lines: EdiInvoiceLine[];
}

export interface EdiFunctionalAck {
  original_control_number: string;
  group_control_number: string;
  status: 'A' | 'R' | 'E'; // Accepted, Rejected, Accepted with Errors
  error_codes?: string[];
}

export interface EdiPartnerProfile {
  id: string;
  tenant_id: string;
  partner_name: string;
  edi_standard: EdiStandard;
  sender_id: string;
  sender_qualifier: string;
  receiver_id: string;
  receiver_qualifier: string;
  element_delimiter: string;
  segment_delimiter: string;
  subelement_delimiter: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EdiMessageLog {
  id: string;
  tenant_id: string;
  partner_id: string;
  direction: EdiDirection;
  standard: EdiStandard;
  transaction_type: EdiTransactionType;
  control_number: string;
  status: EdiMessageStatus;
  raw_content: string;
  parsed_payload?: Record<string, unknown> | null;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// DTOs & Request Interfaces
// ============================================================================

export interface CreateEdiPartnerRequest {
  partner_name: string;
  edi_standard?: EdiStandard;
  sender_id: string;
  sender_qualifier?: string;
  receiver_id: string;
  receiver_qualifier?: string;
  element_delimiter?: string;
  segment_delimiter?: string;
  subelement_delimiter?: string;
}

export interface ParseEdiDocumentRequest {
  partner_id: string;
  raw_content: string;
}

export interface GenerateEdi855Request {
  partner_id: string;
  control_number?: string;
  po_ack: EdiPurchaseOrderAck;
}

export interface GenerateEdi856Request {
  partner_id: string;
  control_number?: string;
  asn: EdiAdvanceShipNotice;
}

export interface GenerateEdi810Request {
  partner_id: string;
  control_number?: string;
  invoice: EdiInvoice;
}

export interface GenerateEdi997Request {
  partner_id: string;
  control_number?: string;
  ack: EdiFunctionalAck;
}
