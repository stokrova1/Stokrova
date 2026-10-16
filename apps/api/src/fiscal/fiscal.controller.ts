import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { FiscalComplianceService } from './fiscal-compliance.service.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator.js';
import { StandardPermissions } from '@stokrova/domain';
import { AuthGuard } from '../auth/auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator.js';
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

@Controller('fiscal')
@RequirePermission(StandardPermissions.TAX_MANAGE)
export class FiscalController {
  constructor(private readonly fiscalService: FiscalComplianceService) {}

  // ==========================================================================
  // Entity Endpoints
  // ==========================================================================

  @Post('entities')
  @UseGuards(AuthGuard, TenantGuard, RbacGuard)
  async createFiscalEntity(
    @CurrentTenant() tenant: { id: string },
    @Body() body: CreateFiscalEntityRequest,
  ): Promise<FiscalEntityProfile> {
    return this.fiscalService.createFiscalEntity(tenant.id, body);
  }

  @Get('entities')
  @UseGuards(AuthGuard, TenantGuard, RbacGuard)
  async listFiscalEntities(
    @CurrentTenant() tenant: { id: string },
  ): Promise<FiscalEntityProfile[]> {
    return this.fiscalService.listFiscalEntities(tenant.id);
  }

  @Get('entities/:id')
  @UseGuards(AuthGuard, TenantGuard, RbacGuard)
  async getFiscalEntity(
    @CurrentTenant() tenant: { id: string },
    @Param('id') id: string,
  ): Promise<FiscalEntityProfile> {
    return this.fiscalService.getFiscalEntity(tenant.id, id);
  }

  // ==========================================================================
  // E-Invoicing Endpoints
  // ==========================================================================

  @Post('e-invoices/generate-xml')
  @UseGuards(AuthGuard, TenantGuard, RbacGuard)
  async generateEInvoiceXml(
    @CurrentTenant() tenant: { id: string },
    @Body() body: GenerateEInvoiceXmlRequest,
  ): Promise<EInvoiceGenerationResult> {
    return this.fiscalService.generateEInvoiceXml(tenant.id, body);
  }

  @Post('e-invoices/validate')
  async validateEInvoice(
    @Body() body: ValidateEInvoiceRequest,
  ): Promise<{ is_valid: boolean; errors: string[] }> {
    return this.fiscalService.validateEInvoice(body);
  }

  // ==========================================================================
  // Cash Register Fiscal Signatures & QR Codes
  // ==========================================================================

  @Post('receipts/sign')
  @UseGuards(AuthGuard, TenantGuard, RbacGuard)
  async signFiscalReceipt(
    @CurrentTenant() tenant: { id: string },
    @Body() body: SignFiscalReceiptRequest,
  ): Promise<FiscalReceiptSignatureRecord> {
    return this.fiscalService.signFiscalReceipt(tenant.id, body);
  }

  // ==========================================================================
  // Cross-Border Tax Scheme Determination
  // ==========================================================================

  @Post('tax/cross-border-scheme')
  determineCrossBorderTax(
    @Body() body: DetermineCrossBorderTaxRequest,
  ): DetermineCrossBorderTaxResult {
    return this.fiscalService.determineCrossBorderTax(body);
  }
}
