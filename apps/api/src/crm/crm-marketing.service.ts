import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  CrmSegment,
  CreateCrmSegmentRequest,
  CrmSegmentPreviewResponse,
  CrmConsentRecord,
  RecordCrmConsentRequest,
  CrmSuppressionEntry,
  AddCrmSuppressionRequest,
  CrmCampaign,
  CreateCrmCampaignRequest,
  CrmMessage,
} from '@stokrova/contracts';
import {
  CreateCrmSegmentSchema,
  RecordCrmConsentSchema,
  AddCrmSuppressionSchema,
  CreateCrmCampaignSchema,
} from '@stokrova/validation';
import {
  evaluateDynamicSegmentRules,
  filterSuppressedRecipients,
} from '@stokrova/domain';
import { CustomersService } from '../customers/customers.service.js';
import { MockCommunicationAdapter } from './adapters/communication.adapter.js';

export interface StoredSegmentMember {
  id: string;
  tenant_id: string;
  segment_id: string;
  customer_id: string;
  added_at: string;
}

@Injectable()
export class CrmMarketingService {
  private readonly segments = new Map<string, CrmSegment>();
  private readonly segmentMembers = new Map<string, StoredSegmentMember>();
  private readonly consentRecords = new Map<string, CrmConsentRecord>();
  private readonly suppressionList = new Map<string, CrmSuppressionEntry>();
  private readonly campaigns = new Map<string, CrmCampaign>();
  private readonly messages = new Map<string, CrmMessage>();
  private readonly processedOperations = new Set<string>(); // tenant:operation_id

  constructor(
    private readonly customersService: CustomersService,
    private readonly commAdapter: MockCommunicationAdapter,
  ) {}

  // ==========================================
  // 1. Segmentation
  // ==========================================

  async createSegment(
    tenantId: string,
    req: CreateCrmSegmentRequest,
  ): Promise<CrmSegment> {
    if (!tenantId) {
      throw new BadRequestException('tenant_id is required');
    }
    const parsed = CreateCrmSegmentSchema.parse(req);
    const code = parsed.code.trim().toUpperCase();

    for (const s of this.segments.values()) {
      if (s.tenant_id === tenantId && s.code === code) {
        throw new ConflictException(`Segment with code ${code} already exists`);
      }
    }

    const now = new Date().toISOString();
    const segment: CrmSegment = {
      id: `seg_${randomUUID()}`,
      tenant_id: tenantId,
      name: parsed.name.trim(),
      code,
      segment_type: parsed.segment_type ?? 'STATIC',
      rules_json: parsed.rules_json ?? null,
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    this.segments.set(segment.id, segment);

    if (parsed.static_customer_ids && parsed.static_customer_ids.length > 0) {
      await this.addStaticMembers(tenantId, segment.id, parsed.static_customer_ids);
    }

    return segment;
  }

  async addStaticMembers(
    tenantId: string,
    segmentId: string,
    customerIds: string[],
  ): Promise<void> {
    const segment = this.segments.get(segmentId);
    if (!segment || segment.tenant_id !== tenantId) {
      throw new NotFoundException(`Segment ${segmentId} not found`);
    }

    const now = new Date().toISOString();
    for (const cid of customerIds) {
      const key = `${tenantId}:${segmentId}:${cid}`;
      if (!this.segmentMembers.has(key)) {
        this.segmentMembers.set(key, {
          id: `sm_${randomUUID()}`,
          tenant_id: tenantId,
          segment_id: segmentId,
          customer_id: cid,
          added_at: now,
        });
      }
    }
  }

  async previewSegment(
    tenantId: string,
    segmentId: string,
  ): Promise<CrmSegmentPreviewResponse> {
    const segment = this.segments.get(segmentId);
    if (!segment || segment.tenant_id !== tenantId) {
      throw new NotFoundException(`Segment ${segmentId} not found`);
    }

    const allCustomers = await this.customersService.listCustomers(tenantId);
    let matchingIds: string[] = [];

    if (segment.segment_type === 'STATIC') {
      const members = Array.from(this.segmentMembers.values()).filter(
        (m) => m.tenant_id === tenantId && m.segment_id === segmentId,
      );
      matchingIds = members.map((m) => m.customer_id);
    } else {
      if (!segment.rules_json) {
        matchingIds = allCustomers.map((c) => c.id);
      } else {
        for (const cust of allCustomers) {
          if (evaluateDynamicSegmentRules(cust, segment.rules_json)) {
            matchingIds.push(cust.id);
          }
        }
      }
    }

    return {
      total_matching: matchingIds.length,
      preview_customer_ids: matchingIds,
    };
  }

  async getSegment(tenantId: string, segmentId: string): Promise<CrmSegment> {
    const segment = this.segments.get(segmentId);
    if (!segment || segment.tenant_id !== tenantId) {
      throw new NotFoundException(`Segment ${segmentId} not found`);
    }
    const preview = await this.previewSegment(tenantId, segmentId);
    segment.member_count = preview.total_matching;
    return segment;
  }

  async listSegments(tenantId: string): Promise<CrmSegment[]> {
    const list = Array.from(this.segments.values()).filter((s) => s.tenant_id === tenantId);
    for (const s of list) {
      const preview = await this.previewSegment(tenantId, s.id);
      s.member_count = preview.total_matching;
    }
    return list;
  }

  // ==========================================
  // 2. Consent Records & Suppression
  // ==========================================

  async recordConsent(
    tenantId: string,
    req: RecordCrmConsentRequest,
  ): Promise<CrmConsentRecord> {
    if (!tenantId) {
      throw new BadRequestException('tenant_id is required');
    }
    const parsed = RecordCrmConsentSchema.parse(req);

    const now = new Date().toISOString();
    const consent: CrmConsentRecord = {
      id: `cst_${randomUUID()}`,
      tenant_id: tenantId,
      customer_id: parsed.customer_id,
      purpose: parsed.purpose,
      channel: parsed.channel,
      status: parsed.status,
      source: parsed.source,
      policy_version: parsed.policy_version,
      timestamp: now,
      notes: parsed.notes ?? null,
    };

    // Key by tenant:customer:purpose:channel to store authoritative latest state
    const key = `${tenantId}:${parsed.customer_id}:${parsed.purpose}:${parsed.channel}`;
    this.consentRecords.set(key, consent);
    return consent;
  }

  async getConsentRecords(
    tenantId: string,
    customerId: string,
  ): Promise<CrmConsentRecord[]> {
    return Array.from(this.consentRecords.values()).filter(
      (c) => c.tenant_id === tenantId && c.customer_id === customerId,
    );
  }

  async addSuppression(
    tenantId: string,
    req: AddCrmSuppressionRequest,
  ): Promise<CrmSuppressionEntry> {
    if (!tenantId) {
      throw new BadRequestException('tenant_id is required');
    }
    const parsed = AddCrmSuppressionSchema.parse(req);
    const identifier = parsed.identifier.trim().toLowerCase();

    const key = `${tenantId}:${parsed.channel}:${identifier}`;
    const now = new Date().toISOString();
    const entry: CrmSuppressionEntry = {
      id: `sup_${randomUUID()}`,
      tenant_id: tenantId,
      channel: parsed.channel,
      identifier,
      reason: parsed.reason,
      suppressed_at: now,
    };

    this.suppressionList.set(key, entry);
    return entry;
  }

  async getSuppressionSet(tenantId: string, channel: string): Promise<Set<string>> {
    const set = new Set<string>();
    for (const s of this.suppressionList.values()) {
      if (s.tenant_id === tenantId && s.channel === channel) {
        set.add(s.identifier.toLowerCase());
      }
    }
    return set;
  }

  // ==========================================
  // 3. Campaigns & Delivery
  // ==========================================

  async createCampaign(
    tenantId: string,
    req: CreateCrmCampaignRequest,
  ): Promise<CrmCampaign> {
    if (!tenantId) {
      throw new BadRequestException('tenant_id is required');
    }
    const parsed = CreateCrmCampaignSchema.parse(req);

    // Verify segment exists
    const segment = this.segments.get(parsed.segment_id);
    if (!segment || segment.tenant_id !== tenantId) {
      throw new NotFoundException(`Segment ${parsed.segment_id} not found`);
    }

    const campaignCode = parsed.campaign_code?.trim().toUpperCase() ?? `CAMP-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

    const now = new Date().toISOString();
    const campaign: CrmCampaign = {
      id: `camp_${randomUUID()}`,
      tenant_id: tenantId,
      campaign_code: campaignCode,
      name: parsed.name.trim(),
      campaign_type: parsed.campaign_type ?? 'ONE_TIME',
      status: 'DRAFT',
      channel: parsed.channel,
      segment_id: parsed.segment_id,
      subject_template: parsed.subject_template ?? null,
      body_template: parsed.body_template,
      budget_limit_minor: parsed.budget_limit_minor ?? '0',
      actual_spend_minor: '0',
      scheduled_at: parsed.scheduled_at ?? null,
      approved_by: null,
      approved_at: null,
      total_recipients: 0,
      sent_count: 0,
      delivered_count: 0,
      failed_count: 0,
      created_at: now,
      updated_at: now,
    };

    this.campaigns.set(campaign.id, campaign);
    return campaign;
  }

  async approveCampaign(
    tenantId: string,
    campaignId: string,
    approvedBy: string,
  ): Promise<CrmCampaign> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign || campaign.tenant_id !== tenantId) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }

    campaign.status = 'APPROVED';
    campaign.approved_by = approvedBy;
    campaign.approved_at = new Date().toISOString();
    campaign.updated_at = new Date().toISOString();

    return campaign;
  }

  async dispatchCampaign(
    tenantId: string,
    campaignId: string,
    operationId?: string,
  ): Promise<{
    campaign: CrmCampaign;
    dispatched_count: number;
    suppressed_count: number;
  }> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign || campaign.tenant_id !== tenantId) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }

    const opKey = `${tenantId}:${campaignId}:${operationId ?? 'default'}`;
    if (operationId && this.processedOperations.has(opKey)) {
      return {
        campaign,
        dispatched_count: campaign.sent_count,
        suppressed_count: campaign.total_recipients - campaign.sent_count,
      };
    }

    // Governance Invariant: Campaign dispatch requires explicit approval!
    if (campaign.status !== 'APPROVED' && campaign.status !== 'SCHEDULED') {
      throw new BadRequestException(
        `Campaign cannot be dispatched in status '${campaign.status}'. Only APPROVED or SCHEDULED campaigns can be dispatched.`,
      );
    }

    if (operationId) this.processedOperations.add(opKey);

    campaign.status = 'RUNNING';
    campaign.updated_at = new Date().toISOString();

    // 1. Fetch audience
    const preview = await this.previewSegment(tenantId, campaign.segment_id);
    const audienceCustomers = [];
    for (const cid of preview.preview_customer_ids) {
      const cust = await this.customersService.getCustomerById(tenantId, cid);
      if (cust) audienceCustomers.push(cust);
    }

    campaign.total_recipients = audienceCustomers.length;

    // 2. Fetch consent and suppression data
    const suppressionSet = await this.getSuppressionSet(tenantId, campaign.channel);
    const allConsents = Array.from(this.consentRecords.values()).filter(
      (c) => c.tenant_id === tenantId,
    );

    const recipientCandidates = audienceCustomers.map((c) => ({
      customer_id: c.id,
      recipient_address: campaign.channel === 'EMAIL' ? c.email ?? undefined : c.phone ?? undefined,
      channel: campaign.channel,
    }));

    // 3. Pre-dispatch real-time suppression filter
    const filterResult = filterSuppressedRecipients(
      recipientCandidates,
      allConsents,
      suppressionSet,
      campaign.channel,
      'MARKETING',
    );

    // 4. Dispatch allowed messages via adapter
    let dispatched = 0;
    let delivered = 0;
    let failed = 0;

    for (const recipient of filterResult.allowed) {
      if ((campaign.status as string) === 'CANCELLED') {
        break; // Cancellation halts remaining unsent messages immediately
      }

      const msgOpId = `${campaignId}:${recipient.customer_id}`;
      const sendResult = await this.commAdapter.sendMessage({
        channel: campaign.channel,
        recipient_address: recipient.recipient_address ?? '',
        subject: campaign.subject_template,
        body: campaign.body_template,
        operation_id: msgOpId,
        tenant_id: tenantId,
      });

      const now = new Date().toISOString();
      const messageRecord: CrmMessage = {
        id: `msg_${randomUUID()}`,
        tenant_id: tenantId,
        campaign_id: campaign.id,
        customer_id: recipient.customer_id,
        channel: campaign.channel,
        recipient_address: recipient.recipient_address ?? '',
        status: sendResult.success ? 'DELIVERED' : 'FAILED',
        operation_id: msgOpId,
        provider_message_id: sendResult.provider_message_id ?? null,
        sent_at: now,
        delivered_at: sendResult.success ? now : null,
        error_message: sendResult.error_message ?? null,
        created_at: now,
      };

      this.messages.set(messageRecord.id, messageRecord);
      dispatched++;
      if (sendResult.success) {
        delivered++;
      } else {
        failed++;
      }
    }

    campaign.sent_count = dispatched;
    campaign.delivered_count = delivered;
    campaign.failed_count = failed;
    campaign.status = (campaign.status as string) === 'CANCELLED' ? 'CANCELLED' : 'COMPLETED';
    campaign.updated_at = new Date().toISOString();

    return {
      campaign,
      dispatched_count: dispatched,
      suppressed_count: filterResult.suppressed.length,
    };
  }

  async cancelCampaign(tenantId: string, campaignId: string): Promise<CrmCampaign> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign || campaign.tenant_id !== tenantId) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }

    campaign.status = 'CANCELLED';
    campaign.updated_at = new Date().toISOString();
    return campaign;
  }

  async listMessages(tenantId: string, campaignId: string): Promise<CrmMessage[]> {
    return Array.from(this.messages.values()).filter(
      (m) => m.tenant_id === tenantId && m.campaign_id === campaignId,
    );
  }

  async getCampaign(tenantId: string, campaignId: string): Promise<CrmCampaign> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign || campaign.tenant_id !== tenantId) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }
    return campaign;
  }

  async listCampaigns(tenantId: string): Promise<CrmCampaign[]> {
    return Array.from(this.campaigns.values()).filter((c) => c.tenant_id === tenantId);
  }
}
