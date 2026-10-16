import { DurableMap } from '../infrastructure/database/durable-map.js';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  EdiPartnerProfile,
  EdiMessageLog,
  EdiPurchaseOrder,
  EdiFunctionalAck,
  CreateEdiPartnerRequest,
  GenerateEdi855Request,
  GenerateEdi856Request,
  GenerateEdi810Request,
  GenerateEdi997Request,
  EdiAdvanceShipNotice,
  EdiInterchangeEnvelope,
} from '@stokrova/contracts';
import {
  CreateEdiPartnerSchema,
  GenerateEdi855Schema,
  GenerateEdi856Schema,
  GenerateEdi810Schema,
  GenerateEdi997Schema,
  EdiAdvanceShipNoticeSchema,
} from '@stokrova/validation';
import {
  parseX12_850,
  generateX12_855,
  generateX12_856,
  generateX12_810,
  parseX12_997,
  generateX12_997,
  parseEdifact_ORDERS,
  generateEdifact_DESADV,
  tokenizeEdiSegments,
} from '@stokrova/domain';

@Injectable()
export class EdiService {
  private readonly partners = new DurableMap<EdiPartnerProfile>('edi_partners');
  private readonly messageLogs = new DurableMap<EdiMessageLog>('edi_message_logs');
  private readonly processedControls = new Set<string>(); // tenant:partner:control:direction

  // ==========================================================================
  // Partner Profile Management
  // ==========================================================================

  async createPartner(
    tenantId: string,
    req: CreateEdiPartnerRequest,
  ): Promise<EdiPartnerProfile> {
    if (!tenantId) {
      throw new BadRequestException('tenant_id is required');
    }
    const parsed = CreateEdiPartnerSchema.parse(req);
    const now = new Date().toISOString();
    const id = randomUUID();

    const partner: EdiPartnerProfile = {
      id,
      tenant_id: tenantId,
      partner_name: parsed.partner_name,
      edi_standard: parsed.edi_standard,
      sender_id: parsed.sender_id,
      sender_qualifier: parsed.sender_qualifier,
      receiver_id: parsed.receiver_id,
      receiver_qualifier: parsed.receiver_qualifier,
      element_delimiter: parsed.element_delimiter,
      segment_delimiter: parsed.segment_delimiter,
      subelement_delimiter: parsed.subelement_delimiter,
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    this.partners.set(`${tenantId}:${id}`, partner);
    return partner;
  }

  async getPartner(tenantId: string, partnerId: string): Promise<EdiPartnerProfile> {
    const partner = this.partners.get(`${tenantId}:${partnerId}`);
    if (!partner) {
      throw new NotFoundException(`EDI Partner profile not found: ${partnerId}`);
    }
    return partner;
  }

  async listPartners(tenantId: string): Promise<EdiPartnerProfile[]> {
    return Array.from(this.partners.values()).filter((p) => p.tenant_id === tenantId);
  }

  // ==========================================================================
  // Inbound EDI Processing (850, 997, ORDERS)
  // ==========================================================================

  async parseInboundDocument(
    tenantId: string,
    partnerId: string,
    rawContent: string,
  ): Promise<{
    messageLog: EdiMessageLog;
    parsed: EdiPurchaseOrder | EdiFunctionalAck;
    ack997?: string;
  }> {
    const partner = await this.getPartner(tenantId, partnerId);
    if (!rawContent || !rawContent.trim()) {
      throw new BadRequestException('raw_content must not be empty');
    }

    const now = new Date().toISOString();
    const logId = randomUUID();

    // Determine document type and extract control number
    const isEdifact = partner.edi_standard === 'UN_EDIFACT' || rawContent.includes('UNB+');
    let controlNumber = 'UNKNOWN';
    let transactionType: '850' | '997' | 'ORDERS' = '850';
    let parsedResult: EdiPurchaseOrder | EdiFunctionalAck;
    let ack997Document: string | undefined;

    if (isEdifact) {
      transactionType = 'ORDERS';
      // Extract UNB control number (UNB+Syntax+Sender+Receiver+Date:Time+ControlNo)
      const unbSegment = rawContent.split("'")[0]?.replace(/\r?\n/g, '').trim();
      if (unbSegment && unbSegment.startsWith('UNB')) {
        const parts = unbSegment.split('+');
        if (parts[5]) {
          controlNumber = parts[5].trim();
        }
      }
      parsedResult = parseEdifact_ORDERS(rawContent);
    } else {
      // ANSI X12
      const segments = tokenizeEdiSegments(
        rawContent,
        partner.segment_delimiter,
        partner.element_delimiter,
      );

      // Extract ISA13 control number
      const isaSeg = segments.find((s) => s[0]?.toUpperCase() === 'ISA');
      if (isaSeg && isaSeg[13]) {
        controlNumber = isaSeg[13].trim();
      }

      // Detect transaction set header (ST01)
      const stSeg = segments.find((s) => s[0]?.toUpperCase() === 'ST');
      const stType = stSeg ? stSeg[1] : '850';

      if (stType === '997') {
        transactionType = '997';
        parsedResult = parseX12_997(segments);
      } else {
        transactionType = '850';
        parsedResult = parseX12_850(segments);

        // Auto-generate 997 functional acknowledgment for inbound PO
        const ackEnvelope: EdiInterchangeEnvelope = {
          sender_id: partner.receiver_id,
          sender_qualifier: partner.receiver_qualifier,
          receiver_id: partner.sender_id,
          receiver_qualifier: partner.sender_qualifier,
          control_number: controlNumber,
          date: new Date().toISOString().slice(2, 10).replace(/-/g, ''),
          time: '1200',
          standard: 'ANSI_X12',
          version: '004010',
        };

        const ackPayload: EdiFunctionalAck = {
          original_control_number: controlNumber,
          group_control_number: '1',
          status: 'A',
        };

        ack997Document = generateX12_997(ackEnvelope, ackPayload);
      }
    }

    // Deduplication check (Rule 18 & 19)
    const dedupKey = `${tenantId}:${partnerId}:${controlNumber}:INBOUND`;
    if (this.processedControls.has(dedupKey)) {
      throw new ConflictException(
        `Duplicate EDI transmission detected: control number ${controlNumber} has already been processed for this partner.`,
      );
    }
    this.processedControls.add(dedupKey);

    const log: EdiMessageLog = {
      id: logId,
      tenant_id: tenantId,
      partner_id: partnerId,
      direction: 'INBOUND',
      standard: isEdifact ? 'UN_EDIFACT' : 'ANSI_X12',
      transaction_type: transactionType,
      control_number: controlNumber,
      status: 'PROCESSED',
      raw_content: rawContent,
      parsed_payload: parsedResult as unknown as Record<string, unknown>,
      created_at: now,
      updated_at: now,
    };

    this.messageLogs.set(`${tenantId}:${logId}`, log);

    return {
      messageLog: log,
      parsed: parsedResult,
      ack997: ack997Document,
    };
  }

  // ==========================================================================
  // Outbound EDI Generation (855, 856, 810, 997, DESADV)
  // ==========================================================================

  private buildEnvelope(
    partner: EdiPartnerProfile,
    customCtrl?: string,
  ): EdiInterchangeEnvelope {
    const ctrl = customCtrl || Math.floor(100000 + Math.random() * 900000).toString();
    const now = new Date();
    const d = now.toISOString().slice(2, 10).replace(/-/g, '');
    const t = now.toISOString().slice(11, 16).replace(':', '');

    return {
      sender_id: partner.receiver_id,
      sender_qualifier: partner.receiver_qualifier,
      receiver_id: partner.sender_id,
      receiver_qualifier: partner.sender_qualifier,
      control_number: ctrl,
      date: d,
      time: t,
      standard: partner.edi_standard,
      version: '004010',
    };
  }

  async generate855(
    tenantId: string,
    req: GenerateEdi855Request,
  ): Promise<{ messageLog: EdiMessageLog; document: string }> {
    const parsed = GenerateEdi855Schema.parse(req);
    const partner = await this.getPartner(tenantId, parsed.partner_id);
    const envelope = this.buildEnvelope(partner, parsed.control_number);

    const document = generateX12_855(envelope, parsed.po_ack);
    const log = this.recordOutboundLog(
      tenantId,
      partner.id,
      '855',
      envelope.control_number,
      document,
      parsed.po_ack as unknown as Record<string, unknown>,
    );

    return { messageLog: log, document };
  }

  async generate856(
    tenantId: string,
    req: GenerateEdi856Request,
  ): Promise<{ messageLog: EdiMessageLog; document: string }> {
    const parsed = GenerateEdi856Schema.parse(req);
    const partner = await this.getPartner(tenantId, parsed.partner_id);
    const envelope = this.buildEnvelope(partner, parsed.control_number);

    const document = generateX12_856(envelope, parsed.asn);
    const log = this.recordOutboundLog(
      tenantId,
      partner.id,
      '856',
      envelope.control_number,
      document,
      parsed.asn as unknown as Record<string, unknown>,
    );

    return { messageLog: log, document };
  }

  async generate810(
    tenantId: string,
    req: GenerateEdi810Request,
  ): Promise<{ messageLog: EdiMessageLog; document: string }> {
    const parsed = GenerateEdi810Schema.parse(req);
    const partner = await this.getPartner(tenantId, parsed.partner_id);
    const envelope = this.buildEnvelope(partner, parsed.control_number);

    const document = generateX12_810(envelope, parsed.invoice);
    const log = this.recordOutboundLog(
      tenantId,
      partner.id,
      '810',
      envelope.control_number,
      document,
      parsed.invoice as unknown as Record<string, unknown>,
    );

    return { messageLog: log, document };
  }

  async generate997(
    tenantId: string,
    req: GenerateEdi997Request,
  ): Promise<{ messageLog: EdiMessageLog; document: string }> {
    const parsed = GenerateEdi997Schema.parse(req);
    const partner = await this.getPartner(tenantId, parsed.partner_id);
    const envelope = this.buildEnvelope(partner, parsed.control_number);

    const document = generateX12_997(envelope, parsed.ack);
    const log = this.recordOutboundLog(
      tenantId,
      partner.id,
      '997',
      envelope.control_number,
      document,
      parsed.ack as unknown as Record<string, unknown>,
    );

    return { messageLog: log, document };
  }

  async generateDesadv(
    tenantId: string,
    partnerId: string,
    asnReq: EdiAdvanceShipNotice,
    controlNumber?: string,
  ): Promise<{ messageLog: EdiMessageLog; document: string }> {
    const parsedAsn = EdiAdvanceShipNoticeSchema.parse(asnReq);
    const partner = await this.getPartner(tenantId, partnerId);
    const envelope = this.buildEnvelope(partner, controlNumber);

    const document = generateEdifact_DESADV(envelope, parsedAsn);
    const log = this.recordOutboundLog(
      tenantId,
      partner.id,
      'DESADV',
      envelope.control_number,
      document,
      parsedAsn as unknown as Record<string, unknown>,
      'UN_EDIFACT',
    );

    return { messageLog: log, document };
  }

  private recordOutboundLog(
    tenantId: string,
    partnerId: string,
    transactionType: EdiMessageLog['transaction_type'],
    controlNumber: string,
    document: string,
    payload: Record<string, unknown>,
    standard: 'ANSI_X12' | 'UN_EDIFACT' = 'ANSI_X12',
  ): EdiMessageLog {
    const now = new Date().toISOString();
    const logId = randomUUID();

    const log: EdiMessageLog = {
      id: logId,
      tenant_id: tenantId,
      partner_id: partnerId,
      direction: 'OUTBOUND',
      standard,
      transaction_type: transactionType,
      control_number: controlNumber,
      status: 'GENERATED',
      raw_content: document,
      parsed_payload: payload,
      created_at: now,
      updated_at: now,
    };

    this.messageLogs.set(`${tenantId}:${logId}`, log);
    return log;
  }

  async listMessageLogs(
    tenantId: string,
    partnerId?: string,
  ): Promise<EdiMessageLog[]> {
    return Array.from(this.messageLogs.values()).filter(
      (m) => m.tenant_id === tenantId && (!partnerId || m.partner_id === partnerId),
    );
  }
}
