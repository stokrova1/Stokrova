import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DurableMap } from '../infrastructure/database/durable-map.js';
import type {
  FiscalEntityProfile,
  FiscalReceiptSignatureRecord,
  EInvoiceGenerationResult,
  DetermineCrossBorderTaxResult,
  CreateFiscalEntityRequest,
  GenerateEInvoiceXmlRequest,
  ValidateEInvoiceRequest,
  SignFiscalReceiptRequest,
  DetermineCrossBorderTaxRequest,
} from '@stokrova/contracts';
import {
  CreateFiscalEntitySchema,
  GenerateEInvoiceXmlSchema,
  ValidateEInvoiceSchema,
  SignFiscalReceiptSchema,
  DetermineCrossBorderTaxSchema,
} from '@stokrova/validation';
import {
  generatePeppolUblInvoiceXml,
  generateFacturXCiiXml,
  validateEInvoiceDocument,
  generateFiscalReceiptSignature,
  determineCrossBorderTaxScheme,
  sha256,
} from '@stokrova/domain';

@Injectable()
export class FiscalComplianceService {
  private readonly entities = new DurableMap<FiscalEntityProfile>('fiscal_entities');
  private readonly receiptChains = new DurableMap<FiscalReceiptSignatureRecord>('fiscal_receipt_chains');
  private readonly lastHashByRegister = new Map<string, string>(); // tenant:registerId -> lastHash

  // ==========================================================================
  // Fiscal Entity Profile Management
  // ==========================================================================

  async createFiscalEntity(
    tenantId: string,
    req: CreateFiscalEntityRequest,
  ): Promise<FiscalEntityProfile> {
    if (!tenantId) {
      throw new BadRequestException('tenant_id is required');
    }
    const parsed = CreateFiscalEntitySchema.parse(req);
    const now = new Date().toISOString();
    const id = `fent_${randomUUID()}`;

    const profile: FiscalEntityProfile = {
      id,
      tenant_id: tenantId,
      company_name: parsed.company_name,
      country_code: parsed.country_code,
      vat_id: parsed.vat_id ?? null,
      tax_registration_id: parsed.tax_registration_id ?? null,
      peppol_endpoint_id: parsed.peppol_endpoint_id ?? null,
      peppol_scheme_id: parsed.peppol_scheme_id ?? null,
      address_line1: parsed.address_line1,
      city: parsed.city,
      postal_code: parsed.postal_code,
      currency: parsed.currency ?? 'EUR',
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    this.entities.set(profile.id, profile);
    return profile;
  }

  async getFiscalEntity(
    tenantId: string,
    entityId: string,
  ): Promise<FiscalEntityProfile> {
    const ent = this.entities.get(entityId);
    if (!ent || ent.tenant_id !== tenantId) {
      throw new NotFoundException(`Fiscal entity '${entityId}' not found`);
    }
    return ent;
  }

  async listFiscalEntities(tenantId: string): Promise<FiscalEntityProfile[]> {
    return Array.from(this.entities.values()).filter((e) => e.tenant_id === tenantId);
  }

  // ==========================================================================
  // PEPPOL & Factur-X Certified E-Invoicing
  // ==========================================================================

  async generateEInvoiceXml(
    tenantId: string,
    req: GenerateEInvoiceXmlRequest,
  ): Promise<EInvoiceGenerationResult> {
    if (!tenantId) {
      throw new BadRequestException('tenant_id is required');
    }
    const parsed = GenerateEInvoiceXmlSchema.parse(req);

    // 1. Schematron validation
    const validation = validateEInvoiceDocument(parsed.document);

    // 2. XML Generation
    let xmlContent: string;
    if (parsed.standard === 'FACTUR_X_COMFORT' || parsed.standard === 'ZUGFERD_2_2') {
      xmlContent = generateFacturXCiiXml(parsed.document, parsed.factur_x_profile);
    } else {
      xmlContent = generatePeppolUblInvoiceXml(parsed.document);
    }

    const digest = sha256(xmlContent);

    return {
      standard: parsed.standard,
      xml_content: xmlContent,
      sha256_digest: digest,
      byte_length: xmlContent.length,
      is_valid: validation.is_valid,
      validation_errors: validation.errors,
    };
  }

  async validateEInvoice(
    req: ValidateEInvoiceRequest,
  ): Promise<{ is_valid: boolean; errors: string[] }> {
    const parsed = ValidateEInvoiceSchema.parse(req);
    return validateEInvoiceDocument(parsed.document);
  }

  // ==========================================================================
  // Cryptographic Fiscal Cash Register Signatures
  // ==========================================================================

  async signFiscalReceipt(
    tenantId: string,
    req: SignFiscalReceiptRequest,
  ): Promise<FiscalReceiptSignatureRecord> {
    if (!tenantId) {
      throw new BadRequestException('tenant_id is required');
    }
    const parsed = SignFiscalReceiptSchema.parse(req);
    const now = parsed.timestamp || new Date().toISOString();

    const chainKey = `${tenantId}:${parsed.register_id}`;
    const previousHash =
      parsed.previous_signature_hash ||
      this.lastHashByRegister.get(chainKey) ||
      this.lastSavedHash(tenantId, parsed.register_id) ||
      'GENESIS_0000000000000000000000000000000000000000000000000000000000000000';

    const { signatureHash, qrPayload } = generateFiscalReceiptSignature({
      registerId: parsed.register_id,
      receiptNumber: parsed.receipt_number,
      sequenceNumber: parsed.sequence_number,
      grossMinor: parsed.gross_amount_minor,
      taxMinor: parsed.tax_amount_minor,
      timestamp: now,
      previousHash,
    });

    const record: FiscalReceiptSignatureRecord = {
      id: `fsig_${randomUUID()}`,
      tenant_id: tenantId,
      register_id: parsed.register_id,
      receipt_number: parsed.receipt_number,
      sequence_number: parsed.sequence_number,
      gross_amount_minor: parsed.gross_amount_minor,
      tax_amount_minor: parsed.tax_amount_minor,
      timestamp: now,
      previous_signature_hash: previousHash,
      signature_hash: signatureHash,
      qr_payload: qrPayload,
      created_at: now,
    };

    this.receiptChains.set(record.id, record);
    this.lastHashByRegister.set(chainKey, signatureHash);
    return record;
  }

  /** After a restart the chain continues from the latest saved receipt, so signatures stay linked. */
  private lastSavedHash(tenantId: string, registerId: string): string | null {
    let best: FiscalReceiptSignatureRecord | null = null;
    for (const r of this.receiptChains.values()) {
      if (r.tenant_id === tenantId && r.register_id === registerId && (!best || r.sequence_number > best.sequence_number)) best = r;
    }
    return best?.signature_hash ?? null;
  }

  // ==========================================================================
  // Cross-Border Digital Tax Determination
  // ==========================================================================

  determineCrossBorderTax(
    req: DetermineCrossBorderTaxRequest,
  ): DetermineCrossBorderTaxResult {
    const parsed = DetermineCrossBorderTaxSchema.parse(req);
    return determineCrossBorderTaxScheme(parsed);
  }
}
