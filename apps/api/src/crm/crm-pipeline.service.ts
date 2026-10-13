import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  CrmLead,
  CreateCrmLeadRequest,
  UpdateCrmLeadRequest,
  ConvertCrmLeadRequest,
  ConvertCrmLeadResponse,
  CrmPipeline,
  CreateCrmPipelineRequest,
  CrmPipelineStage,
  CreateCrmPipelineStageRequest,
  CrmOpportunity,
  CreateCrmOpportunityRequest,
  TransitionCrmOpportunityStageRequest,
  CrmOpportunityStageHistory,
} from '@stokrova/contracts';
import {
  CreateCrmLeadSchema,
  UpdateCrmLeadSchema,
  ConvertCrmLeadSchema,
  CreateCrmPipelineSchema,
  CreateCrmPipelineStageSchema,
  CreateCrmOpportunitySchema,
  TransitionCrmOpportunityStageSchema,
} from '@stokrova/validation';
import { CustomersService } from '../customers/customers.service.js';
import { QuotationsService } from '../quotations/quotations.service.js';

@Injectable()
export class CrmPipelineService {
  private readonly leads = new Map<string, CrmLead>();
  private readonly pipelines = new Map<string, CrmPipeline>();
  private readonly stages = new Map<string, CrmPipelineStage>();
  private readonly opportunities = new Map<string, CrmOpportunity>();
  private readonly stageHistories = new Map<string, CrmOpportunityStageHistory>();

  constructor(
    private readonly customersService: CustomersService,
    private readonly quotationsService?: QuotationsService,
  ) {}

  // ==========================================
  // 1. Leads Management
  // ==========================================

  async createLead(tenantId: string, req: CreateCrmLeadRequest): Promise<CrmLead> {
    if (!tenantId) {
      throw new BadRequestException('tenant_id is required');
    }
    const parsed = CreateCrmLeadSchema.parse(req);
    const leadCode = parsed.lead_code?.trim().toUpperCase() ?? `LEAD-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

    for (const l of this.leads.values()) {
      if (l.tenant_id === tenantId && l.lead_code === leadCode) {
        throw new ConflictException(`Lead with code ${leadCode} already exists`);
      }
    }

    const now = new Date().toISOString();
    const lead: CrmLead = {
      id: `lead_${randomUUID()}`,
      tenant_id: tenantId,
      lead_code: leadCode,
      first_name: parsed.first_name,
      last_name: parsed.last_name,
      company_name: parsed.company_name ?? null,
      email: parsed.email ?? null,
      phone: parsed.phone ?? null,
      status: 'NEW',
      source: parsed.source ?? 'WEBSITE',
      qualification_score_bp: parsed.qualification_score_bp ?? 0,
      disqualification_reason: null,
      assigned_to: parsed.assigned_to ?? null,
      converted_customer_id: null,
      converted_opportunity_id: null,
      external_id: parsed.external_id ?? null,
      notes: parsed.notes ?? null,
      created_at: now,
      updated_at: now,
    };

    this.leads.set(lead.id, lead);
    return lead;
  }

  /**
   * Idempotent ingestion of external leads (e.g. from webhooks, ads, forms)
   */
  async ingestExternalLead(tenantId: string, req: CreateCrmLeadRequest): Promise<CrmLead> {
    if (!tenantId) {
      throw new BadRequestException('tenant_id is required');
    }
    const parsed = CreateCrmLeadSchema.parse(req);

    if (parsed.external_id) {
      for (const existing of this.leads.values()) {
        if (existing.tenant_id === tenantId && existing.external_id === parsed.external_id) {
          return existing; // Idempotent return
        }
      }
    }

    return this.createLead(tenantId, req);
  }

  async updateLead(
    tenantId: string,
    leadId: string,
    req: UpdateCrmLeadRequest,
  ): Promise<CrmLead> {
    const lead = this.leads.get(leadId);
    if (!lead || lead.tenant_id !== tenantId) {
      throw new NotFoundException(`Lead ${leadId} not found`);
    }

    const parsed = UpdateCrmLeadSchema.parse(req);

    if (parsed.first_name !== undefined) lead.first_name = parsed.first_name;
    if (parsed.last_name !== undefined) lead.last_name = parsed.last_name;
    if (parsed.company_name !== undefined) lead.company_name = parsed.company_name;
    if (parsed.email !== undefined) lead.email = parsed.email;
    if (parsed.phone !== undefined) lead.phone = parsed.phone;
    if (parsed.status !== undefined) lead.status = parsed.status;
    if (parsed.source !== undefined) lead.source = parsed.source;
    if (parsed.qualification_score_bp !== undefined) lead.qualification_score_bp = parsed.qualification_score_bp;
    if (parsed.disqualification_reason !== undefined) lead.disqualification_reason = parsed.disqualification_reason;
    if (parsed.assigned_to !== undefined) lead.assigned_to = parsed.assigned_to;
    if (parsed.notes !== undefined) lead.notes = parsed.notes;
    lead.updated_at = new Date().toISOString();

    return lead;
  }

  async convertLead(
    tenantId: string,
    req: ConvertCrmLeadRequest,
  ): Promise<ConvertCrmLeadResponse> {
    if (!tenantId) {
      throw new BadRequestException('tenant_id is required');
    }
    const parsed = ConvertCrmLeadSchema.parse(req);

    const lead = this.leads.get(parsed.lead_id);
    if (!lead || lead.tenant_id !== tenantId) {
      throw new NotFoundException(`Lead ${parsed.lead_id} not found`);
    }

    if (lead.status === 'CONVERTED') {
      throw new ConflictException(`Lead ${parsed.lead_id} has already been converted`);
    }

    // 1. Create or find Customer
    let customerId = lead.converted_customer_id;
    if (!customerId) {
      const displayName = lead.company_name
        ? lead.company_name
        : `${lead.first_name} ${lead.last_name}`.trim();

      const createdCustomer = await this.customersService.createCustomer(tenantId, 'SYSTEM', {
        customer_code: `CUST-${Date.now().toString(36).toUpperCase()}`,
        display_name: displayName,
        legal_name: lead.company_name ?? displayName,
        email: lead.email,
        phone: lead.phone,
        notes: `Converted from lead ${lead.lead_code}`,
      });
      customerId = createdCustomer.id;
    }

    // 2. Optionally create Opportunity
    let opportunityId: string | undefined = undefined;
    if (parsed.create_opportunity) {
      let pipelineId = parsed.pipeline_id;
      if (!pipelineId) {
        const defaultPipeline = await this.getOrCreateDefaultPipeline(tenantId);
        pipelineId = defaultPipeline.id;
      }

      const defaultStages = await this.listStages(tenantId, pipelineId);
      const firstStage = defaultStages[0];

      const opp = await this.createOpportunity(tenantId, {
        title: parsed.opportunity_title ?? `Deal for ${lead.company_name ?? lead.first_name}`,
        customer_id: customerId,
        pipeline_id: pipelineId,
        current_stage_id: firstStage?.id,
        estimated_value_minor: parsed.estimated_value_minor ?? '0',
        currency_code: parsed.currency_code ?? 'USD',
      });
      opportunityId = opp.id;
    }

    // 3. Mark Lead as CONVERTED
    lead.status = 'CONVERTED';
    lead.converted_customer_id = customerId;
    lead.converted_opportunity_id = opportunityId ?? null;
    lead.updated_at = new Date().toISOString();

    return {
      lead_id: lead.id,
      customer_id: customerId,
      opportunity_id: opportunityId,
      converted_at: lead.updated_at,
    };
  }

  async getLead(tenantId: string, leadId: string): Promise<CrmLead> {
    const lead = this.leads.get(leadId);
    if (!lead || lead.tenant_id !== tenantId) {
      throw new NotFoundException(`Lead ${leadId} not found`);
    }
    return lead;
  }

  async listLeads(tenantId: string): Promise<CrmLead[]> {
    return Array.from(this.leads.values()).filter((l) => l.tenant_id === tenantId);
  }

  // ==========================================
  // 2. Pipelines & Stages
  // ==========================================

  async createPipeline(
    tenantId: string,
    req: CreateCrmPipelineRequest,
  ): Promise<CrmPipeline> {
    if (!tenantId) {
      throw new BadRequestException('tenant_id is required');
    }
    const parsed = CreateCrmPipelineSchema.parse(req);
    const code = parsed.code.trim().toUpperCase();

    for (const p of this.pipelines.values()) {
      if (p.tenant_id === tenantId && p.code === code) {
        throw new ConflictException(`Pipeline with code ${code} already exists`);
      }
    }

    const now = new Date().toISOString();
    const pipeline: CrmPipeline = {
      id: `pipe_${randomUUID()}`,
      tenant_id: tenantId,
      code,
      name: parsed.name.trim(),
      is_default: parsed.is_default ?? false,
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    this.pipelines.set(pipeline.id, pipeline);
    return pipeline;
  }

  async getOrCreateDefaultPipeline(tenantId: string): Promise<CrmPipeline> {
    for (const p of this.pipelines.values()) {
      if (p.tenant_id === tenantId && p.is_default) {
        return p;
      }
    }
    // Create default standard pipeline
    const pipeline = await this.createPipeline(tenantId, {
      code: 'DEFAULT',
      name: 'Standard Sales Pipeline',
      is_default: true,
    });

    // Seed default stages
    await this.createStage(tenantId, {
      pipeline_id: pipeline.id,
      stage_code: 'DISCOVERY',
      name: 'Discovery',
      order_index: 0,
      probability_bp: 1000, // 10%
    });
    await this.createStage(tenantId, {
      pipeline_id: pipeline.id,
      stage_code: 'PROPOSAL',
      name: 'Proposal / Quote',
      order_index: 1,
      probability_bp: 5000, // 50%
    });
    await this.createStage(tenantId, {
      pipeline_id: pipeline.id,
      stage_code: 'NEGOTIATION',
      name: 'Negotiation',
      order_index: 2,
      probability_bp: 8000, // 80%
    });
    await this.createStage(tenantId, {
      pipeline_id: pipeline.id,
      stage_code: 'WON',
      name: 'Closed Won',
      order_index: 3,
      probability_bp: 10000, // 100%
      is_won_stage: true,
    });
    await this.createStage(tenantId, {
      pipeline_id: pipeline.id,
      stage_code: 'LOST',
      name: 'Closed Lost',
      order_index: 4,
      probability_bp: 0,
      is_lost_stage: true,
    });

    return pipeline;
  }

  async listPipelines(tenantId: string): Promise<CrmPipeline[]> {
    const pipes = Array.from(this.pipelines.values()).filter((p) => p.tenant_id === tenantId);
    for (const p of pipes) {
      p.stages = await this.listStages(tenantId, p.id);
    }
    return pipes;
  }

  async getPipeline(tenantId: string, pipelineId: string): Promise<CrmPipeline> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline || pipeline.tenant_id !== tenantId) {
      throw new NotFoundException(`Pipeline ${pipelineId} not found`);
    }
    pipeline.stages = await this.listStages(tenantId, pipelineId);
    return pipeline;
  }

  async createStage(
    tenantId: string,
    req: CreateCrmPipelineStageRequest,
  ): Promise<CrmPipelineStage> {
    if (!tenantId) {
      throw new BadRequestException('tenant_id is required');
    }
    const parsed = CreateCrmPipelineStageSchema.parse(req);

    const pipeline = this.pipelines.get(parsed.pipeline_id);
    if (!pipeline || pipeline.tenant_id !== tenantId) {
      throw new NotFoundException(`Pipeline ${parsed.pipeline_id} not found`);
    }

    const stageCode = parsed.stage_code.trim().toUpperCase();
    for (const s of this.stages.values()) {
      if (
        s.tenant_id === tenantId &&
        s.pipeline_id === parsed.pipeline_id &&
        s.stage_code === stageCode
      ) {
        throw new ConflictException(`Stage with code ${stageCode} already exists in this pipeline`);
      }
    }

    const now = new Date().toISOString();
    const stage: CrmPipelineStage = {
      id: `stg_${randomUUID()}`,
      tenant_id: tenantId,
      pipeline_id: parsed.pipeline_id,
      stage_code: stageCode,
      name: parsed.name.trim(),
      order_index: parsed.order_index,
      probability_bp: parsed.probability_bp,
      is_won_stage: parsed.is_won_stage ?? false,
      is_lost_stage: parsed.is_lost_stage ?? false,
      created_at: now,
      updated_at: now,
    };

    this.stages.set(stage.id, stage);
    return stage;
  }

  async listStages(tenantId: string, pipelineId: string): Promise<CrmPipelineStage[]> {
    return Array.from(this.stages.values())
      .filter((s) => s.tenant_id === tenantId && s.pipeline_id === pipelineId)
      .sort((a, b) => a.order_index - b.order_index);
  }

  // ==========================================
  // 3. Opportunities Management
  // ==========================================

  async createOpportunity(
    tenantId: string,
    req: CreateCrmOpportunityRequest,
  ): Promise<CrmOpportunity> {
    if (!tenantId) {
      throw new BadRequestException('tenant_id is required');
    }
    const parsed = CreateCrmOpportunitySchema.parse(req);

    // Verify Customer
    const customer = await this.customersService.getCustomerById(tenantId, parsed.customer_id);
    if (!customer) {
      throw new NotFoundException(`Customer ${parsed.customer_id} not found`);
    }

    // Verify Pipeline
    const pipeline = this.pipelines.get(parsed.pipeline_id);
    if (!pipeline || pipeline.tenant_id !== tenantId) {
      throw new NotFoundException(`Pipeline ${parsed.pipeline_id} not found`);
    }

    // Resolve initial stage
    const stages = await this.listStages(tenantId, parsed.pipeline_id);
    if (stages.length === 0) {
      throw new BadRequestException('Pipeline must have at least one stage');
    }

    let initialStage = stages[0]!;
    if (parsed.current_stage_id) {
      const match = stages.find((s) => s.id === parsed.current_stage_id);
      if (!match) {
        throw new NotFoundException(`Stage ${parsed.current_stage_id} not found in this pipeline`);
      }
      initialStage = match;
    }

    const probabilityBp = parsed.probability_bp ?? initialStage.probability_bp;
    const oppCode = parsed.opportunity_code?.trim().toUpperCase() ?? `OPP-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

    const now = new Date().toISOString();
    const opp: CrmOpportunity = {
      id: `opp_${randomUUID()}`,
      tenant_id: tenantId,
      opportunity_code: oppCode,
      title: parsed.title.trim(),
      customer_id: parsed.customer_id,
      pipeline_id: parsed.pipeline_id,
      current_stage_id: initialStage.id,
      estimated_value_minor: parsed.estimated_value_minor,
      currency_code: parsed.currency_code ?? 'USD',
      probability_bp: probabilityBp,
      expected_close_date: parsed.expected_close_date ?? null,
      assigned_to: parsed.assigned_to ?? null,
      status: initialStage.is_won_stage ? 'WON' : initialStage.is_lost_stage ? 'LOST' : 'OPEN',
      loss_reason: null,
      created_at: now,
      updated_at: now,
    };

    this.opportunities.set(opp.id, opp);

    // Record initial stage history
    const hist: CrmOpportunityStageHistory = {
      id: `osh_${randomUUID()}`,
      tenant_id: tenantId,
      opportunity_id: opp.id,
      from_stage_id: null,
      to_stage_id: initialStage.id,
      changed_by: 'SYSTEM',
      notes: 'Initial creation',
      transitioned_at: now,
    };
    this.stageHistories.set(hist.id, hist);

    return opp;
  }

  async transitionOpportunityStage(
    tenantId: string,
    opportunityId: string,
    req: TransitionCrmOpportunityStageRequest,
    changedBy: string,
  ): Promise<CrmOpportunity> {
    const opp = this.opportunities.get(opportunityId);
    if (!opp || opp.tenant_id !== tenantId) {
      throw new NotFoundException(`Opportunity ${opportunityId} not found`);
    }

    const parsed = TransitionCrmOpportunityStageSchema.parse(req);

    const targetStage = this.stages.get(parsed.to_stage_id);
    if (!targetStage || targetStage.tenant_id !== tenantId || targetStage.pipeline_id !== opp.pipeline_id) {
      throw new NotFoundException(`Target stage ${parsed.to_stage_id} not found in this pipeline`);
    }

    const fromStageId = opp.current_stage_id;
    opp.current_stage_id = targetStage.id;
    opp.probability_bp = targetStage.probability_bp;

    if (targetStage.is_won_stage) {
      opp.status = 'WON';
    } else if (targetStage.is_lost_stage) {
      opp.status = 'LOST';
      opp.loss_reason = parsed.loss_reason ?? 'Lost to competition or abandoned';
    } else {
      opp.status = 'OPEN';
    }

    const now = new Date().toISOString();
    opp.updated_at = now;

    // Record stage history
    const hist: CrmOpportunityStageHistory = {
      id: `osh_${randomUUID()}`,
      tenant_id: tenantId,
      opportunity_id: opp.id,
      from_stage_id: fromStageId,
      to_stage_id: targetStage.id,
      changed_by: changedBy,
      notes: parsed.notes ?? null,
      transitioned_at: now,
    };
    this.stageHistories.set(hist.id, hist);

    return opp;
  }

  async convertOpportunityToQuotation(
    tenantId: string,
    opportunityId: string,
    params: {
      branch_id: string;
      warehouse_id: string;
      line_items: any[];
    },
  ): Promise<any> {
    const opp = this.opportunities.get(opportunityId);
    if (!opp || opp.tenant_id !== tenantId) {
      throw new NotFoundException(`Opportunity ${opportunityId} not found`);
    }

    if (!this.quotationsService) {
      throw new BadRequestException('QuotationsService not configured');
    }

    // Call established QuotationsService preserving commercial document boundaries
    return this.quotationsService.createQuotation(tenantId, 'SYSTEM', {
      customer_id: opp.customer_id,
      branch_id: params.branch_id,
      warehouse_id: params.warehouse_id,
      currency_code: opp.currency_code,
      lines: params.line_items as any,
      notes: `Generated from Opportunity ${opp.opportunity_code}: ${opp.title}`,
    });
  }

  async getOpportunity(tenantId: string, opportunityId: string): Promise<CrmOpportunity> {
    const opp = this.opportunities.get(opportunityId);
    if (!opp || opp.tenant_id !== tenantId) {
      throw new NotFoundException(`Opportunity ${opportunityId} not found`);
    }
    return opp;
  }

  async listOpportunities(
    tenantId: string,
    pipelineId?: string,
  ): Promise<CrmOpportunity[]> {
    return Array.from(this.opportunities.values()).filter(
      (opp) => opp.tenant_id === tenantId && (!pipelineId || opp.pipeline_id === pipelineId),
    );
  }

  async getOpportunityStageHistory(
    tenantId: string,
    opportunityId: string,
  ): Promise<CrmOpportunityStageHistory[]> {
    return Array.from(this.stageHistories.values())
      .filter((h) => h.tenant_id === tenantId && h.opportunity_id === opportunityId)
      .sort((a, b) => (a.transitioned_at < b.transitioned_at ? -1 : 1));
  }
}
