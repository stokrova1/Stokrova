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
import { BatchesService } from './batches.service.js';
import { SerialsService } from './serials.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator.js';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import {
  CreateBatchSchema,
  UpdateBatchSchema,
  QuarantineHoldSchema,
  QuarantineReleaseSchema,
  CreateSerialSchema,
  BatchRegisterSerialsSchema,
  UpdateSerialLocationSchema,
} from '@stokrova/validation';
import type {
  BatchResponse,
  ListBatchesResponse,
  CreateBatchRequest,
  UpdateBatchRequest,
  QuarantineHoldRequest,
  QuarantineReleaseRequest,
  BatchStatus,
  SerialResponse,
  ListSerialsResponse,
  CreateSerialRequest,
  BatchRegisterSerialsRequest,
  UpdateSerialLocationRequest,
  SerialStatus,
} from '@stokrova/contracts';
import { StandardPermissions } from '@stokrova/domain';

@Controller('tracking')
@UseGuards(AuthGuard, TenantGuard, RbacGuard)
export class TrackingController {
  constructor(
    private readonly batchesService: BatchesService,
    private readonly serialsService: SerialsService,
  ) {}

  // --------------------------------------------------------------------------
  // Batch / Lot Management
  // --------------------------------------------------------------------------

  @Post('batches')
  @RequirePermission(StandardPermissions.INVENTORY_ADJUST)
  async createBatch(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<BatchResponse> {
    const parseResult = CreateBatchSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid batch creation payload.',
          details: parseResult.error.format(),
        },
      });
    }

    const batch = await this.batchesService.createBatch(
      tenantId,
      parseResult.data as CreateBatchRequest,
    );
    return { batch };
  }

  @Get('batches')
  @RequirePermission(StandardPermissions.INVENTORY_VIEW)
  async getBatches(
    @CurrentTenant() tenantId: string,
    @Query('variant_id') variantId?: string,
    @Query('status') status?: BatchStatus,
  ): Promise<ListBatchesResponse> {
    const batches = await this.batchesService.getBatches(
      tenantId,
      variantId,
      status,
    );
    return { batches };
  }

  @Get('batches/:id/metrics')
  @RequirePermission(StandardPermissions.INVENTORY_VIEW)
  async getBatchMetrics(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Query('as_of') asOf?: string,
  ): Promise<BatchResponse> {
    const result = await this.batchesService.getBatchWithMetrics(
      tenantId,
      id,
      asOf,
    );
    return result;
  }

  @Get('batches/:id')
  @RequirePermission(StandardPermissions.INVENTORY_VIEW)
  async getBatchById(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<BatchResponse> {
    const batch = await this.batchesService.getBatchById(tenantId, id);
    return { batch };
  }

  @Patch('batches/:id')
  @RequirePermission(StandardPermissions.INVENTORY_ADJUST)
  async updateBatch(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<BatchResponse> {
    const parseResult = UpdateBatchSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid batch update payload.',
          details: parseResult.error.format(),
        },
      });
    }

    const batch = await this.batchesService.updateBatch(
      tenantId,
      id,
      parseResult.data as UpdateBatchRequest,
    );
    return { batch };
  }

  @Post('batches/:id/quarantine')
  @RequirePermission(StandardPermissions.INVENTORY_ADJUST)
  async quarantineBatchHold(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<BatchResponse> {
    const parseResult = QuarantineHoldSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid quarantine hold payload.',
          details: parseResult.error.format(),
        },
      });
    }

    const batch = await this.batchesService.quarantineHold(
      tenantId,
      id,
      parseResult.data as QuarantineHoldRequest,
    );
    return { batch };
  }

  @Post('batches/:id/release')
  @RequirePermission(StandardPermissions.INVENTORY_ADJUST)
  async quarantineBatchRelease(
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<BatchResponse> {
    const parseResult = QuarantineReleaseSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid quarantine release payload.',
          details: parseResult.error.format(),
        },
      });
    }

    const batch = await this.batchesService.quarantineRelease(
      tenantId,
      id,
      parseResult.data as QuarantineReleaseRequest,
      userId,
    );
    return { batch };
  }

  // --------------------------------------------------------------------------
  // Serial Number Tracking
  // --------------------------------------------------------------------------

  @Post('serials')
  @RequirePermission(StandardPermissions.INVENTORY_ADJUST)
  async createSerial(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<SerialResponse> {
    const parseResult = CreateSerialSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid serial creation payload.',
          details: parseResult.error.format(),
        },
      });
    }

    const serial = await this.serialsService.createSerial(
      tenantId,
      parseResult.data as CreateSerialRequest,
    );
    return { serial };
  }

  @Post('serials/bulk')
  @RequirePermission(StandardPermissions.INVENTORY_ADJUST)
  async bulkRegisterSerials(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<ListSerialsResponse> {
    const parseResult = BatchRegisterSerialsSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid bulk serial registration payload.',
          details: parseResult.error.format(),
        },
      });
    }

    const serials = await this.serialsService.bulkRegisterSerials(
      tenantId,
      parseResult.data as BatchRegisterSerialsRequest,
    );
    return { serials };
  }

  @Get('serials')
  @RequirePermission(StandardPermissions.INVENTORY_VIEW)
  async getSerials(
    @CurrentTenant() tenantId: string,
    @Query('variant_id') variantId?: string,
    @Query('warehouse_id') warehouseId?: string,
    @Query('batch_id') batchId?: string,
    @Query('status') status?: SerialStatus,
  ): Promise<ListSerialsResponse> {
    const serials = await this.serialsService.getSerials(tenantId, {
      variant_id: variantId,
      warehouse_id: warehouseId,
      batch_id: batchId,
      status,
    });
    return { serials };
  }

  @Get('serials/:id')
  @RequirePermission(StandardPermissions.INVENTORY_VIEW)
  async getSerialById(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<SerialResponse> {
    const serial = await this.serialsService.getSerialById(tenantId, id);
    return { serial };
  }

  @Patch('serials/:id/location')
  @RequirePermission(StandardPermissions.INVENTORY_ADJUST)
  async updateSerialLocation(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<SerialResponse> {
    const parseResult = UpdateSerialLocationSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid serial location update payload.',
          details: parseResult.error.format(),
        },
      });
    }

    const serial = await this.serialsService.updateLocation(
      tenantId,
      id,
      parseResult.data as UpdateSerialLocationRequest,
    );
    return { serial };
  }

  @Post('serials/:id/quarantine')
  @RequirePermission(StandardPermissions.INVENTORY_ADJUST)
  async quarantineSerialHold(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<SerialResponse> {
    const parseResult = QuarantineHoldSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid quarantine hold payload.',
          details: parseResult.error.format(),
        },
      });
    }

    const serial = await this.serialsService.quarantineHold(
      tenantId,
      id,
      parseResult.data as QuarantineHoldRequest,
    );
    return { serial };
  }

  @Post('serials/:id/release')
  @RequirePermission(StandardPermissions.INVENTORY_ADJUST)
  async quarantineSerialRelease(
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<SerialResponse> {
    const parseResult = QuarantineReleaseSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid quarantine release payload.',
          details: parseResult.error.format(),
        },
      });
    }

    const serial = await this.serialsService.quarantineRelease(
      tenantId,
      id,
      parseResult.data as QuarantineReleaseRequest,
      userId,
    );
    return { serial };
  }
}
