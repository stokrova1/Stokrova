import { Injectable } from '@nestjs/common';
import type {
  CrmPipelineMetrics,
  CrmFunnelConversion,
  CrmCampaignAttribution,
} from '@stokrova/contracts';
import {
  calculatePipelineExpectedValue,
  calculateFunnelConversionRates,
  calculateWinLossRate,
} from '@stokrova/domain';
import { CrmPipelineService } from './crm-pipeline.service.js';
import { CrmMarketingService } from './crm-marketing.service.js';
import { OrdersService } from '../orders/orders.service.js';

@Injectable()
export class CrmAnalyticsService {
  constructor(
    private readonly pipelineService: CrmPipelineService,
    private readonly marketingService: CrmMarketingService,
    private readonly ordersService?: OrdersService,
  ) {}

  // ==========================================
  // 1. Pipeline Metrics & Forecasting
  // ==========================================

  async getPipelineMetrics(
    tenantId: string,
    pipelineId: string,
  ): Promise<CrmPipelineMetrics> {
    const opps = await this.pipelineService.listOpportunities(tenantId, pipelineId);

    let openValue = 0n;
    let weightedPipelineValue = 0n;
    let wonValue = 0n;
    let wonCount = 0;
    let lostCount = 0;

    for (const opp of opps) {
      const val = BigInt(opp.estimated_value_minor);
      if (opp.status === 'OPEN') {
        openValue += val;
        const weighted = calculatePipelineExpectedValue(val, opp.probability_bp);
        weightedPipelineValue += weighted;
      } else if (opp.status === 'WON') {
        wonValue += val;
        wonCount++;
      } else if (opp.status === 'LOST') {
        lostCount++;
      }
    }

    const { win_rate_bp } = calculateWinLossRate(wonCount, lostCount);

    return {
      total_opportunities: opps.length,
      open_value_minor: openValue.toString(),
      weighted_pipeline_value_minor: weightedPipelineValue.toString(),
      won_value_minor: wonValue.toString(),
      win_rate_bp,
    };
  }

  // ==========================================
  // 2. Sales Funnel Conversion
  // ==========================================

  async getFunnelConversion(
    tenantId: string,
    pipelineId: string,
  ): Promise<CrmFunnelConversion[]> {
    const stages = await this.pipelineService.listStages(tenantId, pipelineId);
    const opps = await this.pipelineService.listOpportunities(tenantId, pipelineId);

    const stageCounts = stages.map((s) => {
      const count = opps.filter((o) => o.current_stage_id === s.id).length;
      return {
        stage_code: s.stage_code,
        stage_name: s.name,
        count,
      };
    });

    return calculateFunnelConversionRates(stageCounts);
  }

  // ==========================================
  // 3. Campaign Commercial Attribution
  // ==========================================

  async getCampaignAttribution(
    tenantId: string,
    campaignId: string,
    touchpointModel: 'FIRST_TOUCH' | 'LAST_TOUCH' = 'LAST_TOUCH',
  ): Promise<CrmCampaignAttribution> {
    const campaign = await this.marketingService.getCampaign(tenantId, campaignId);
    const messages = await this.marketingService.listMessages(tenantId, campaignId);

    // Get unique customers who received messages in this campaign
    const touchedCustomerIds = new Set<string>();
    for (const m of messages) {
      if (m.status === 'DELIVERED') {
        touchedCustomerIds.add(m.customer_id);
      }
    }

    let attributedRevenue = 0n;
    if (this.ordersService && touchedCustomerIds.size > 0) {
      try {
        const allOrders = await this.ordersService.listSalesOrders(tenantId, {});
        for (const order of allOrders) {
          if (
            order.customer_id &&
            touchedCustomerIds.has(order.customer_id) &&
            order.status !== 'CANCELLED'
          ) {
            attributedRevenue += BigInt(order.grand_total_minor);
          }
        }
      } catch {
        // Fallback if orders service not configured
      }
    }

    return {
      campaign_id: campaign.id,
      campaign_code: campaign.campaign_code,
      campaign_name: campaign.name,
      attributed_revenue_minor: attributedRevenue.toString(),
      touchpoint_model: touchpointModel,
    };
  }
}
