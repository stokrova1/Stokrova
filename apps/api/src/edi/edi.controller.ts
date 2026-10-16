import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EdiService } from './edi.service.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator.js';
import { StandardPermissions } from '@stokrova/domain';
import { AuthGuard } from '../auth/auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator.js';
import type {
  EdiPartnerProfile,
  EdiMessageLog,
  EdiPurchaseOrder,
  EdiFunctionalAck,
  CreateEdiPartnerRequest,
  ParseEdiDocumentRequest,
  GenerateEdi855Request,
  GenerateEdi856Request,
  GenerateEdi810Request,
  GenerateEdi997Request,
  EdiAdvanceShipNotice,
} from '@stokrova/contracts';

@Controller('edi')
@RequirePermission(StandardPermissions.EDI_MANAGE)
export class EdiController {
  constructor(private readonly ediService: EdiService) {}

  // ==========================================================================
  // Partner Profile Endpoints
  // ==========================================================================

  @Post('partners')
  @UseGuards(AuthGuard, TenantGuard, RbacGuard)
  async createPartner(
    @CurrentTenant() tenant: { id: string },
    @Body() body: CreateEdiPartnerRequest,
  ): Promise<EdiPartnerProfile> {
    return this.ediService.createPartner(tenant.id, body);
  }

  @Get('partners')
  @UseGuards(AuthGuard, TenantGuard, RbacGuard)
  async listPartners(
    @CurrentTenant() tenant: { id: string },
  ): Promise<EdiPartnerProfile[]> {
    return this.ediService.listPartners(tenant.id);
  }

  @Get('partners/:id')
  @UseGuards(AuthGuard, TenantGuard, RbacGuard)
  async getPartner(
    @CurrentTenant() tenant: { id: string },
    @Param('id') id: string,
  ): Promise<EdiPartnerProfile> {
    return this.ediService.getPartner(tenant.id, id);
  }

  // ==========================================================================
  // Inbound EDI Processing Endpoints
  // ==========================================================================

  @Post('inbound/parse')
  @UseGuards(AuthGuard, TenantGuard, RbacGuard)
  async parseInbound(
    @CurrentTenant() tenant: { id: string },
    @Body() body: ParseEdiDocumentRequest,
  ): Promise<{
    messageLog: EdiMessageLog;
    parsed: EdiPurchaseOrder | EdiFunctionalAck;
    ack997?: string;
  }> {
    return this.ediService.parseInboundDocument(
      tenant.id,
      body.partner_id,
      body.raw_content,
    );
  }

  // ==========================================================================
  // Outbound EDI Generation Endpoints
  // ==========================================================================

  @Post('outbound/855')
  @UseGuards(AuthGuard, TenantGuard, RbacGuard)
  async generate855(
    @CurrentTenant() tenant: { id: string },
    @Body() body: GenerateEdi855Request,
  ): Promise<{ messageLog: EdiMessageLog; document: string }> {
    return this.ediService.generate855(tenant.id, body);
  }

  @Post('outbound/856')
  @UseGuards(AuthGuard, TenantGuard, RbacGuard)
  async generate856(
    @CurrentTenant() tenant: { id: string },
    @Body() body: GenerateEdi856Request,
  ): Promise<{ messageLog: EdiMessageLog; document: string }> {
    return this.ediService.generate856(tenant.id, body);
  }

  @Post('outbound/810')
  @UseGuards(AuthGuard, TenantGuard, RbacGuard)
  async generate810(
    @CurrentTenant() tenant: { id: string },
    @Body() body: GenerateEdi810Request,
  ): Promise<{ messageLog: EdiMessageLog; document: string }> {
    return this.ediService.generate810(tenant.id, body);
  }

  @Post('outbound/997')
  @UseGuards(AuthGuard, TenantGuard, RbacGuard)
  async generate997(
    @CurrentTenant() tenant: { id: string },
    @Body() body: GenerateEdi997Request,
  ): Promise<{ messageLog: EdiMessageLog; document: string }> {
    return this.ediService.generate997(tenant.id, body);
  }

  @Post('outbound/desadv')
  @UseGuards(AuthGuard, TenantGuard, RbacGuard)
  async generateDesadv(
    @CurrentTenant() tenant: { id: string },
    @Body() body: { partner_id: string; asn: EdiAdvanceShipNotice; control_number?: string },
  ): Promise<{ messageLog: EdiMessageLog; document: string }> {
    return this.ediService.generateDesadv(
      tenant.id,
      body.partner_id,
      body.asn,
      body.control_number,
    );
  }

  // ==========================================================================
  // EDI Message Logs & Audit Endpoints
  // ==========================================================================

  @Get('messages')
  @UseGuards(AuthGuard, TenantGuard, RbacGuard)
  async listMessages(
    @CurrentTenant() tenant: { id: string },
    @Query('partnerId') partnerId?: string,
  ): Promise<EdiMessageLog[]> {
    return this.ediService.listMessageLogs(tenant.id, partnerId);
  }
}
