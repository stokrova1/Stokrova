import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { B2bCommerceService } from './b2b-commerce.service.js';
import { B2bPunchoutService } from './b2b-punchout.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator.js';
import type {
  B2bOrganization,
  B2bCreditAccount,
  CreditExposureBreakdown,
  B2bContractPriceItem,
  ResolvedB2bPrice,
  B2bRequisition,
  PunchoutOrderMessage,
  CreateB2bOrganizationRequest,
  UpdateB2bCreditLimitRequest,
  SetB2bContractPriceRequest,
  EvaluateB2bPriceRequest,
  CheckCreditExposureRequest,
  CreateRequisitionRequest,
  ApproveRequisitionRequest,
  RejectRequisitionRequest,
} from '@stokrova/contracts';

@Controller('b2b')
export class B2bController {
  constructor(
    private readonly b2bService: B2bCommerceService,
    private readonly punchoutService: B2bPunchoutService,
  ) {}

  // ==========================================================================
  // Organizations
  // ==========================================================================

  @Post('organizations')
  @UseGuards(AuthGuard, TenantGuard)
  async createOrganization(
    @CurrentTenant() tenant: { id: string },
    @Body() body: CreateB2bOrganizationRequest,
  ): Promise<B2bOrganization> {
    return this.b2bService.createOrganization(tenant.id, body);
  }

  @Get('organizations')
  @UseGuards(AuthGuard, TenantGuard)
  async listOrganizations(
    @CurrentTenant() tenant: { id: string },
  ): Promise<B2bOrganization[]> {
    return this.b2bService.listOrganizations(tenant.id);
  }

  @Get('organizations/:id')
  @UseGuards(AuthGuard, TenantGuard)
  async getOrganization(
    @CurrentTenant() tenant: { id: string },
    @Param('id') id: string,
  ): Promise<B2bOrganization> {
    return this.b2bService.getOrganization(tenant.id, id);
  }

  // ==========================================================================
  // Credit Limit & Underwriting
  // ==========================================================================

  @Post('organizations/:id/credit')
  @UseGuards(AuthGuard, TenantGuard)
  async updateCreditLimit(
    @CurrentTenant() tenant: { id: string },
    @Param('id') id: string,
    @Body() body: UpdateB2bCreditLimitRequest,
  ): Promise<B2bCreditAccount> {
    return this.b2bService.updateCreditLimit(tenant.id, id, body);
  }

  @Get('organizations/:id/credit')
  @UseGuards(AuthGuard, TenantGuard)
  async getCreditAccount(
    @CurrentTenant() tenant: { id: string },
    @Param('id') id: string,
  ): Promise<B2bCreditAccount> {
    return this.b2bService.getCreditAccount(tenant.id, id);
  }

  @Post('credit/check')
  @UseGuards(AuthGuard, TenantGuard)
  async checkCreditExposure(
    @CurrentTenant() tenant: { id: string },
    @Body() body: CheckCreditExposureRequest,
  ): Promise<CreditExposureBreakdown> {
    return this.b2bService.checkCreditExposure(tenant.id, body);
  }

  // ==========================================================================
  // Contract Pricing & Tier Resolution
  // ==========================================================================

  @Post('organizations/:id/contract-prices')
  @UseGuards(AuthGuard, TenantGuard)
  async setContractPrice(
    @CurrentTenant() tenant: { id: string },
    @Param('id') id: string,
    @Body() body: SetB2bContractPriceRequest,
  ): Promise<B2bContractPriceItem> {
    return this.b2bService.setContractPrice(tenant.id, id, body);
  }

  @Get('organizations/:id/contract-prices')
  @UseGuards(AuthGuard, TenantGuard)
  async listContractPrices(
    @CurrentTenant() tenant: { id: string },
    @Param('id') id: string,
  ): Promise<B2bContractPriceItem[]> {
    return this.b2bService.listContractPrices(tenant.id, id);
  }

  @Post('pricing/evaluate')
  @UseGuards(AuthGuard, TenantGuard)
  async evaluatePrice(
    @CurrentTenant() tenant: { id: string },
    @Body() body: EvaluateB2bPriceRequest,
  ): Promise<ResolvedB2bPrice> {
    return this.b2bService.evaluatePrice(tenant.id, body);
  }

  // ==========================================================================
  // Purchase Requisitions
  // ==========================================================================

  @Post('requisitions')
  @UseGuards(AuthGuard, TenantGuard)
  async createRequisition(
    @CurrentTenant() tenant: { id: string },
    @Body() body: CreateRequisitionRequest,
  ): Promise<B2bRequisition> {
    return this.b2bService.createRequisition(tenant.id, body);
  }

  @Get('requisitions')
  @UseGuards(AuthGuard, TenantGuard)
  async listRequisitions(
    @CurrentTenant() tenant: { id: string },
    @Query('organization_id') organizationId?: string,
  ): Promise<B2bRequisition[]> {
    return this.b2bService.listRequisitions(tenant.id, organizationId);
  }

  @Get('requisitions/:id')
  @UseGuards(AuthGuard, TenantGuard)
  async getRequisition(
    @CurrentTenant() tenant: { id: string },
    @Param('id') id: string,
  ): Promise<B2bRequisition> {
    return this.b2bService.getRequisition(tenant.id, id);
  }

  @Post('requisitions/:id/approve')
  @UseGuards(AuthGuard, TenantGuard)
  async approveRequisition(
    @CurrentTenant() tenant: { id: string },
    @Param('id') id: string,
    @Body() body: ApproveRequisitionRequest,
  ): Promise<B2bRequisition> {
    return this.b2bService.approveRequisition(tenant.id, id, body);
  }

  @Post('requisitions/:id/reject')
  @UseGuards(AuthGuard, TenantGuard)
  async rejectRequisition(
    @CurrentTenant() tenant: { id: string },
    @Param('id') id: string,
    @Body() body: RejectRequisitionRequest,
  ): Promise<B2bRequisition> {
    return this.b2bService.rejectRequisition(tenant.id, id, body);
  }

  // ==========================================================================
  // PunchOut cXML Integration
  // ==========================================================================

  @Post('punchout/setup')
  @UseGuards(AuthGuard, TenantGuard)
  async handlePunchoutSetup(
    @CurrentTenant() tenant: { id: string },
    @Body() body: { organization_id: string; cxml_content: string; shared_secret?: string },
  ): Promise<{ sessionId: string; startUrl: string; buyerCookie: string }> {
    return this.punchoutService.handlePunchoutSetupXml(
      tenant.id,
      body.organization_id,
      body.cxml_content,
      body.shared_secret,
    );
  }

  @Post('punchout/checkout')
  @UseGuards(AuthGuard, TenantGuard)
  async checkoutPunchoutCart(
    @CurrentTenant() tenant: { id: string },
    @Body() body: { sessionId: string; orderMessage: PunchoutOrderMessage },
  ): Promise<{ cxmlMessage: string; browserFormPostUrl: string }> {
    return this.punchoutService.checkoutPunchoutCart(
      tenant.id,
      body.sessionId,
      body.orderMessage,
    );
  }
}
