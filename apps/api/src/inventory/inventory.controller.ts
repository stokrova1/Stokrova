import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { StockLedgerService } from './stock-ledger.service.js';
import { StockReservationsService } from './stock-reservations.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator.js';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import {
  PostStockMovementSchema,
  CreateStockReservationSchema,
  OpeningBalanceSchema,
  StockAdjustmentSchema,
  StockTransferSchema,
  StockWriteOffSchema,
  StockCountDiscrepancySchema,
  ReconcileBalancesSchema,
  FefoRecommendationSchema,
} from '@stokrova/validation';
import type {
  StockMovementResponse,
  ListStockLedgerResponse,
  PostStockMovementRequest,
  StockReservationResponse,
  ListStockReservationsResponse,
  CreateStockReservationRequest,
  ListStockBalancesResponse,
  ReservationStatus,
  OpeningBalanceRequest,
  StockAdjustmentRequest,
  StockTransferRequest,
  StockWriteOffRequest,
  StockCountDiscrepancyRequest,
  ReconcileBalancesRequest,
  ReconcileBalancesResponse,
  FefoRecommendationRequest,
  FefoRecommendationResponse,
} from '@stokrova/contracts';
import { StandardPermissions } from '@stokrova/domain';

@Controller('inventory')
@UseGuards(AuthGuard, TenantGuard, RbacGuard)
export class InventoryController {
  constructor(
    private readonly stockLedgerService: StockLedgerService,
    private readonly stockReservationsService: StockReservationsService,
  ) {}

  // --------------------------------------------------------------------------
  // Stock Movements & Immutable Ledger
  // --------------------------------------------------------------------------

  @Post('movements')
  @RequirePermission(StandardPermissions.INVENTORY_ADJUST)
  async postMovement(
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
  ): Promise<StockMovementResponse> {
    const parseResult = PostStockMovementSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid stock movement payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.stockLedgerService.postMovement(
      tenantId,
      userId,
      parseResult.data as PostStockMovementRequest,
    );
  }

  @Get('ledger')
  @RequirePermission(StandardPermissions.INVENTORY_VIEW)
  async getLedgerEntries(
    @CurrentTenant() tenantId: string,
    @Query('variant_id') variantId?: string,
    @Query('reference_id') referenceId?: string,
  ): Promise<ListStockLedgerResponse> {
    const entries = await this.stockLedgerService.getLedgerEntries(tenantId, {
      variant_id: variantId,
      reference_id: referenceId,
    });
    return { entries };
  }

  @Get('balances')
  @RequirePermission(StandardPermissions.INVENTORY_VIEW)
  async getBalances(
    @CurrentTenant() tenantId: string,
    @Query('warehouse_id') warehouseId?: string,
    @Query('variant_id') variantId?: string,
  ): Promise<ListStockBalancesResponse> {
    const balances = await this.stockLedgerService.getBalances(tenantId, {
      warehouse_id: warehouseId,
      variant_id: variantId,
    });
    return { balances };
  }

  @Post('opening-balances')
  @RequirePermission(StandardPermissions.INVENTORY_ADJUST)
  async initiateOpeningBalance(
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
  ): Promise<StockMovementResponse> {
    const parseResult = OpeningBalanceSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid opening balance payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.stockLedgerService.initiateOpeningBalance(
      tenantId,
      userId,
      parseResult.data as OpeningBalanceRequest,
    );
  }

  @Post('adjustments')
  @RequirePermission(StandardPermissions.INVENTORY_ADJUST)
  async adjustStock(
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
  ): Promise<StockMovementResponse> {
    const parseResult = StockAdjustmentSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid stock adjustment payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.stockLedgerService.adjustStock(
      tenantId,
      userId,
      parseResult.data as StockAdjustmentRequest,
    );
  }

  @Post('transfers')
  @RequirePermission(StandardPermissions.INVENTORY_TRANSFER)
  async transferStock(
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
  ): Promise<StockMovementResponse> {
    const parseResult = StockTransferSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid stock transfer payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.stockLedgerService.transferStock(
      tenantId,
      userId,
      parseResult.data as StockTransferRequest,
    );
  }

  @Post('write-offs')
  @RequirePermission(StandardPermissions.INVENTORY_ADJUST)
  async writeOffStock(
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
  ): Promise<StockMovementResponse> {
    const parseResult = StockWriteOffSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid stock write-off payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.stockLedgerService.writeOffStock(
      tenantId,
      userId,
      parseResult.data as StockWriteOffRequest,
    );
  }

  @Post('stock-counts')
  @RequirePermission(StandardPermissions.INVENTORY_ADJUST)
  async reconcileStockCount(
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
  ): Promise<{ discrepancy: number; movement_response?: StockMovementResponse | null }> {
    const parseResult = StockCountDiscrepancySchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid stock count payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.stockLedgerService.reconcileStockCount(
      tenantId,
      userId,
      parseResult.data as StockCountDiscrepancyRequest,
    );
  }

  @Post('reconcile-balances')
  @RequirePermission(StandardPermissions.INVENTORY_ADJUST)
  async reconcileBalances(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<ReconcileBalancesResponse> {
    const parseResult = ReconcileBalancesSchema.safeParse(body || {});
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid balance reconciliation payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.stockLedgerService.reconcileBalancesAgainstLedger(
      tenantId,
      parseResult.data as ReconcileBalancesRequest,
    );
  }

  @Get('fefo-recommendations')
  @RequirePermission(StandardPermissions.INVENTORY_VIEW)
  async getFefoRecommendations(
    @CurrentTenant() tenantId: string,
    @Query() query: unknown,
  ): Promise<FefoRecommendationResponse> {
    const parseResult = FefoRecommendationSchema.safeParse(query);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid FEFO recommendation query parameters.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.stockLedgerService.getFefoRecommendation(
      tenantId,
      parseResult.data as FefoRecommendationRequest,
    );
  }

  // --------------------------------------------------------------------------
  // Commercial Stock Reservations
  // --------------------------------------------------------------------------

  @Post('reservations')
  @RequirePermission(StandardPermissions.INVENTORY_ADJUST)
  async createReservation(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<StockReservationResponse> {
    const parseResult = CreateStockReservationSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid stock reservation payload.',
          details: parseResult.error.format(),
        },
      });
    }

    const reservation = await this.stockReservationsService.createReservation(
      tenantId,
      parseResult.data as CreateStockReservationRequest,
    );
    return { reservation };
  }

  @Get('reservations')
  @RequirePermission(StandardPermissions.INVENTORY_VIEW)
  async getReservations(
    @CurrentTenant() tenantId: string,
    @Query('variant_id') variantId?: string,
    @Query('warehouse_id') warehouseId?: string,
    @Query('status') status?: ReservationStatus,
  ): Promise<ListStockReservationsResponse> {
    const reservations = await this.stockReservationsService.getReservations(
      tenantId,
      { variant_id: variantId, warehouse_id: warehouseId, status },
    );
    return { reservations };
  }

  @Post('reservations/:id/release')
  @RequirePermission(StandardPermissions.INVENTORY_ADJUST)
  async releaseReservation(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<StockReservationResponse> {
    const reservation = await this.stockReservationsService.releaseReservation(
      tenantId,
      id,
    );
    return { reservation };
  }

  @Post('reservations/:id/fulfill')
  @RequirePermission(StandardPermissions.INVENTORY_ADJUST)
  async fulfillReservation(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<StockReservationResponse> {
    const reservation = await this.stockReservationsService.fulfillReservation(
      tenantId,
      id,
    );
    return { reservation };
  }

  @Post('reservations/reconcile-expired')
  @RequirePermission(StandardPermissions.INVENTORY_ADJUST)
  async reconcileExpired(
    @CurrentTenant() tenantId: string,
  ): Promise<{ reconciled_count: number }> {
    const count =
      await this.stockReservationsService.reconcileExpiredReservations(tenantId);
    return { reconciled_count: count };
  }
}
