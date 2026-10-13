import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator.js';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { StandardPermissions } from '@stokrova/domain';
import { LogisticsFulfillmentService } from './logistics-fulfillment.service.js';
import { LogisticsShipmentsService } from './logistics-shipments.service.js';
import { LogisticsCarrierService } from './logistics-carrier.service.js';
import { LogisticsDeliveryService } from './logistics-delivery.service.js';
import { LogisticsReverseService } from './logistics-reverse.service.js';
import { LogisticsChargesService } from './logistics-charges.service.js';

@Controller('v1/logistics')
@UseGuards(AuthGuard, TenantGuard, RbacGuard)
export class LogisticsController {
  constructor(
    private readonly fulfillmentService: LogisticsFulfillmentService,
    private readonly shipmentsService: LogisticsShipmentsService,
    private readonly carrierService: LogisticsCarrierService,
    private readonly deliveryService: LogisticsDeliveryService,
    private readonly reverseService: LogisticsReverseService,
    private readonly chargesService: LogisticsChargesService,
  ) {}

  // ==========================================
  // 1. Fulfillment Planning & Orchestration
  // ==========================================

  @Post('fulfillments/plan')
  @RequirePermission(StandardPermissions.LOGISTICS_FULFILLMENT_MANAGE)
  async planFulfillment(
    @CurrentTenant() tenantId: string,
    @Body() body: any,
  ) {
    return this.fulfillmentService.planFulfillment(tenantId, body);
  }

  @Get('fulfillments/:id')
  @RequirePermission(StandardPermissions.LOGISTICS_FULFILLMENT_VIEW)
  async getFulfillment(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.fulfillmentService.getFulfillment(tenantId, id);
  }

  @Get('fulfillments')
  @RequirePermission(StandardPermissions.LOGISTICS_FULFILLMENT_VIEW)
  async listFulfillments(
    @CurrentTenant() tenantId: string,
    @Query('order_id') orderId?: string,
  ) {
    return this.fulfillmentService.listFulfillments(tenantId, orderId);
  }

  @Post('fulfillments/:id/hold')
  @RequirePermission(StandardPermissions.LOGISTICS_FULFILLMENT_MANAGE)
  async holdFulfillment(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.fulfillmentService.holdFulfillment(tenantId, id, body);
  }

  @Post('fulfillments/:id/release')
  @RequirePermission(StandardPermissions.LOGISTICS_FULFILLMENT_MANAGE)
  async releaseFulfillment(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.fulfillmentService.releaseFulfillment(tenantId, id, body);
  }

  // ==========================================
  // 2. Shipping Rates & Quotation
  // ==========================================

  @Post('quotes')
  @RequirePermission(StandardPermissions.LOGISTICS_SHIPMENT_VIEW)
  async quoteRates(
    @CurrentTenant() tenantId: string,
    @Body() body: any,
  ) {
    return this.carrierService.quoteRates(tenantId, body);
  }

  // ==========================================
  // 3. Shipments & Carrier Booking
  // ==========================================

  @Post('shipments')
  @RequirePermission(StandardPermissions.LOGISTICS_SHIPMENT_MANAGE)
  async createShipment(
    @CurrentTenant() tenantId: string,
    @Body() body: any,
  ) {
    return this.shipmentsService.createShipment(tenantId, body);
  }

  @Get('shipments/:id')
  @RequirePermission(StandardPermissions.LOGISTICS_SHIPMENT_VIEW)
  async getShipment(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.shipmentsService.getShipment(tenantId, id);
  }

  @Get('shipments')
  @RequirePermission(StandardPermissions.LOGISTICS_SHIPMENT_VIEW)
  async listShipments(
    @CurrentTenant() tenantId: string,
    @Query('order_id') orderId?: string,
    @Query('fulfillment_id') fulfillmentId?: string,
    @Query('status') status?: string,
  ) {
    return this.shipmentsService.listShipments(tenantId, {
      orderId,
      fulfillmentId,
      status,
    });
  }

  @Post('shipments/:id/book')
  @RequirePermission(StandardPermissions.LOGISTICS_SHIPMENT_MANAGE)
  async bookCarrierShipment(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.shipmentsService.bookCarrierShipment(tenantId, id, body);
  }

  @Post('shipments/:id/dispatch')
  @RequirePermission(StandardPermissions.LOGISTICS_SHIPMENT_DISPATCH)
  async dispatchShipment(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.shipmentsService.dispatchShipment(tenantId, id);
  }

  @Post('shipments/:id/milestones')
  @RequirePermission(StandardPermissions.LOGISTICS_SHIPMENT_MANAGE)
  async addShipmentMilestone(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.shipmentsService.addMilestone(tenantId, id, body);
  }

  @Post('shipments/:id/cancel')
  @RequirePermission(StandardPermissions.LOGISTICS_SHIPMENT_MANAGE)
  async cancelShipment(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.shipmentsService.cancelShipment(tenantId, id, body);
  }

  // ==========================================
  // 4. Logistics Charges
  // ==========================================

  @Post('shipments/:id/charges')
  @RequirePermission(StandardPermissions.LOGISTICS_COST_MANAGE)
  async addCharge(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.chargesService.addCharge(tenantId, id, body);
  }

  @Get('shipments/:id/charges')
  @RequirePermission(StandardPermissions.LOGISTICS_COST_VIEW)
  async getShipmentCharges(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.chargesService.getShipmentCharges(tenantId, id);
  }

  // ==========================================
  // 5. Carrier Webhooks
  // ==========================================

  @Post('webhooks/carrier')
  async handleCarrierWebhook(@Body() body: any) {
    return this.shipmentsService.handleCarrierWebhook(body);
  }

  // ==========================================
  // 6. Delivery Runs & Proof of Delivery
  // ==========================================

  @Post('runs/plan-from-shipments')
  @RequirePermission(StandardPermissions.LOGISTICS_DELIVERY_RUN_MANAGE)
  async planRunFromShipments(
    @CurrentTenant() tenantId: string,
    @Body()
    body: {
      warehouse_id: string;
      vehicle_id: string;
      driver_id: string;
      shipment_ids: string[];
    },
  ) {
    return this.deliveryService.createDeliveryRunFromShipments(
      tenantId,
      body.warehouse_id,
      body.vehicle_id,
      body.driver_id,
      body.shipment_ids,
    );
  }

  @Post('runs/:id/dispatch')
  @RequirePermission(StandardPermissions.LOGISTICS_DELIVERY_RUN_DISPATCH)
  async dispatchDeliveryRun(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.deliveryService.dispatchDeliveryRun(tenantId, id);
  }

  @Post('runs/:runId/stops/:stopId/pod')
  @RequirePermission(StandardPermissions.LOGISTICS_POD_RECORD)
  async recordPod(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('runId') runId: string,
    @Param('stopId') stopId: string,
    @Headers('x-operation-id') operationId: string,
    @Body() body: any,
  ) {
    return this.deliveryService.recordProofOfDelivery(
      tenantId,
      runId,
      stopId,
      user.id,
      body,
      operationId ?? `op_${Date.now()}`,
    );
  }

  @Post('runs/:runId/stops/:stopId/fail')
  @RequirePermission(StandardPermissions.LOGISTICS_DELIVERY_EXECUTE)
  async failStop(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('runId') runId: string,
    @Param('stopId') stopId: string,
    @Body() body: any,
  ) {
    return this.deliveryService.recordFailedAttempt(
      tenantId,
      runId,
      stopId,
      user.id,
      body,
    );
  }

  @Post('sync/offline-deliveries')
  @RequirePermission(StandardPermissions.LOGISTICS_POD_RECORD)
  async syncOfflineDeliveries(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Body() body: any,
  ) {
    return this.deliveryService.syncOfflineDelivery(
      tenantId,
      user.id,
      body.records ?? [],
    );
  }

  // ==========================================
  // 7. Reverse Logistics (RTO & Reshipment)
  // ==========================================

  @Post('reverse/return-to-origin')
  @RequirePermission(StandardPermissions.LOGISTICS_REVERSE_MANAGE)
  async initiateReturnToOrigin(
    @CurrentTenant() tenantId: string,
    @Body() body: { shipment_id: string; reason: string },
  ) {
    return this.reverseService.initiateReturnToOrigin(
      tenantId,
      body.shipment_id,
      body.reason,
    );
  }

  @Post('reverse/rma')
  @RequirePermission(StandardPermissions.LOGISTICS_REVERSE_MANAGE)
  async createRmaFromReturnedShipment(
    @CurrentTenant() tenantId: string,
    @Body() body: { shipment_id: string; receiving_location_id?: string },
  ) {
    return this.reverseService.createRmaFromReturnedShipment(
      tenantId,
      body.shipment_id,
      body.receiving_location_id,
    );
  }

  @Post('reverse/reshipments')
  @RequirePermission(StandardPermissions.LOGISTICS_SHIPMENT_MANAGE)
  async createReshipment(
    @CurrentTenant() tenantId: string,
    @Body() body: any,
  ) {
    return this.reverseService.createReshipment(tenantId, body);
  }
}
