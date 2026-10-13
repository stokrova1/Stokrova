import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { SuppliersService } from './suppliers.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator.js';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator.js';
import {
  CreateSupplierSchema,
  UpdateSupplierSchema,
  CreateSupplierProductMappingSchema,
  UpdateSupplierProductMappingSchema,
} from '@stokrova/validation';
import type {
  CreateSupplierRequest,
  UpdateSupplierRequest,
  SupplierResponse,
  ListSuppliersResponse,
  CreateSupplierProductMappingRequest,
  UpdateSupplierProductMappingRequest,
  SupplierProductMappingResponse,
  ListSupplierProductMappingsResponse,
  SupplierPerformanceMetrics,
  SupplierStatus,
} from '@stokrova/contracts';
import { StandardPermissions } from '@stokrova/domain';

@Controller('v1/procurement/suppliers')
@UseGuards(AuthGuard, TenantGuard, RbacGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  @RequirePermission(StandardPermissions.PURCHASES_CREATE)
  async createSupplier(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<SupplierResponse> {
    const parseResult = CreateSupplierSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid supplier payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.suppliersService.createSupplier(
      tenantId,
      parseResult.data as CreateSupplierRequest,
    );
  }

  @Get()
  @RequirePermission(StandardPermissions.PURCHASES_CREATE)
  async listSuppliers(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: SupplierStatus,
  ): Promise<ListSuppliersResponse> {
    return this.suppliersService.listSuppliers(tenantId, { status });
  }

  @Get(':id')
  @RequirePermission(StandardPermissions.PURCHASES_CREATE)
  async getSupplierById(
    @CurrentTenant() tenantId: string,
    @Param('id') supplierId: string,
  ): Promise<SupplierResponse> {
    return this.suppliersService.getSupplierById(tenantId, supplierId);
  }

  @Patch(':id')
  @RequirePermission(StandardPermissions.PURCHASES_CREATE)
  async updateSupplier(
    @CurrentTenant() tenantId: string,
    @Param('id') supplierId: string,
    @Body() body: unknown,
  ): Promise<SupplierResponse> {
    const parseResult = UpdateSupplierSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid supplier update payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.suppliersService.updateSupplier(
      tenantId,
      supplierId,
      parseResult.data as UpdateSupplierRequest,
    );
  }

  @Post('mappings')
  @RequirePermission(StandardPermissions.PURCHASES_CREATE)
  async createMapping(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<SupplierProductMappingResponse> {
    const parseResult = CreateSupplierProductMappingSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid supplier product mapping payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.suppliersService.createSupplierProductMapping(
      tenantId,
      parseResult.data as CreateSupplierProductMappingRequest,
    );
  }

  @Get('mappings')
  @RequirePermission(StandardPermissions.PURCHASES_CREATE)
  async listMappings(
    @CurrentTenant() tenantId: string,
    @Query('supplier_id') supplierId?: string,
    @Query('variant_id') variantId?: string,
  ): Promise<ListSupplierProductMappingsResponse> {
    return this.suppliersService.getSupplierProductMappings(
      tenantId,
      supplierId,
      variantId,
    );
  }

  @Patch('mappings/:id')
  @RequirePermission(StandardPermissions.PURCHASES_CREATE)
  async updateMapping(
    @CurrentTenant() tenantId: string,
    @Param('id') mappingId: string,
    @Body() body: unknown,
  ): Promise<SupplierProductMappingResponse> {
    const parseResult = UpdateSupplierProductMappingSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid supplier product mapping update payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.suppliersService.updateSupplierProductMapping(
      tenantId,
      mappingId,
      parseResult.data as UpdateSupplierProductMappingRequest,
    );
  }

  @Get(':id/performance')
  @RequirePermission(StandardPermissions.PURCHASES_CREATE)
  async getPerformance(
    @CurrentTenant() tenantId: string,
    @Param('id') supplierId: string,
  ): Promise<SupplierPerformanceMetrics> {
    return this.suppliersService.getSupplierPerformance(tenantId, supplierId);
  }
}
