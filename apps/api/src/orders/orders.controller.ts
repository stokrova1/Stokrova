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
import { OrdersService } from './orders.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator.js';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import {
  CreateSalesOrderSchema,
  FulfillOrderLinesSchema,
  DispatchSalesOrderSchema,
} from '@stokrova/validation';
import type {
  CreateSalesOrderRequest,
  FulfillOrderLinesRequest,
  DispatchSalesOrderRequest,
  SalesOrderResponse,
  SalesChannelType,
  SalesOrderStatus,
} from '@stokrova/contracts';
import { StandardPermissions } from '@stokrova/domain';

@Controller('orders')
@UseGuards(AuthGuard, TenantGuard, RbacGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @RequirePermission(StandardPermissions.SALES_ORDER_CREATE)
  async createSalesOrder(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<SalesOrderResponse> {
    const parseResult = CreateSalesOrderSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid sales order payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.ordersService.createSalesOrder(
      tenantId,
      parseResult.data as CreateSalesOrderRequest,
    );
  }

  @Get()
  @RequirePermission(StandardPermissions.SALES_ORDER_VIEW)
  async listSalesOrders(
    @CurrentTenant() tenantId: string,
    @Query('channel_type') channelType?: SalesChannelType,
    @Query('status') status?: SalesOrderStatus,
    @Query('customer_id') customerId?: string,
    @Query('branch_id') branchId?: string,
  ): Promise<SalesOrderResponse[]> {
    return this.ordersService.listSalesOrders(tenantId, {
      channel_type: channelType,
      status,
      customer_id: customerId,
      branch_id: branchId,
    });
  }

  @Get(':id')
  @RequirePermission(StandardPermissions.SALES_ORDER_VIEW)
  async getOrderById(
    @CurrentTenant() tenantId: string,
    @Param('id') orderId: string,
  ): Promise<SalesOrderResponse> {
    return this.ordersService.getOrderById(tenantId, orderId);
  }

  @Post(':id/confirm')
  @RequirePermission(StandardPermissions.SALES_ORDER_CREATE)
  async confirmSalesOrder(
    @CurrentTenant() tenantId: string,
    @Param('id') orderId: string,
  ): Promise<SalesOrderResponse> {
    return this.ordersService.confirmSalesOrder(tenantId, orderId);
  }

  @Post(':id/fulfill')
  @RequirePermission(StandardPermissions.INVENTORY_PICK)
  async fulfillOrderLines(
    @CurrentTenant() tenantId: string,
    @Param('id') orderId: string,
    @Body() body: unknown,
  ): Promise<SalesOrderResponse> {
    const parseResult = FulfillOrderLinesSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid order fulfillment payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.ordersService.fulfillOrderLines(
      tenantId,
      orderId,
      parseResult.data as FulfillOrderLinesRequest,
    );
  }

  @Post(':id/dispatch')
  @RequirePermission(StandardPermissions.INVENTORY_PICK)
  async dispatchSalesOrder(
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') orderId: string,
    @Body() body: unknown,
  ): Promise<SalesOrderResponse> {
    const parseResult = DispatchSalesOrderSchema.safeParse(body || {});
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid order dispatch payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.ordersService.dispatchSalesOrder(
      tenantId,
      userId,
      orderId,
      parseResult.data as DispatchSalesOrderRequest,
    );
  }

  @Post(':id/deliver')
  @RequirePermission(StandardPermissions.INVENTORY_PICK)
  async deliverSalesOrder(
    @CurrentTenant() tenantId: string,
    @Param('id') orderId: string,
  ): Promise<SalesOrderResponse> {
    return this.ordersService.deliverSalesOrder(tenantId, orderId);
  }

  @Post(':id/cancel')
  @RequirePermission(StandardPermissions.SALES_ORDER_CANCEL)
  async cancelSalesOrder(
    @CurrentTenant() tenantId: string,
    @Param('id') orderId: string,
  ): Promise<SalesOrderResponse> {
    return this.ordersService.cancelSalesOrder(tenantId, orderId);
  }
}
