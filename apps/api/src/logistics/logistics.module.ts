import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module.js';
import { DeliveryModule } from '../delivery/delivery.module.js';
import { WarehouseModule } from '../warehouse/warehouse.module.js';
import { ReturnsModule } from '../returns/returns.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { RbacModule } from '../rbac/rbac.module.js';

import { LogisticsController } from './logistics.controller.js';
import { LogisticsFulfillmentService } from './logistics-fulfillment.service.js';
import { LogisticsShipmentsService } from './logistics-shipments.service.js';
import { LogisticsCarrierService } from './logistics-carrier.service.js';
import { LogisticsDeliveryService } from './logistics-delivery.service.js';
import { LogisticsReverseService } from './logistics-reverse.service.js';
import { LogisticsChargesService } from './logistics-charges.service.js';
import { MockCarrierAdapter } from './adapters/carrier.adapter.js';

@Module({
  imports: [
    OrdersModule,
    DeliveryModule,
    WarehouseModule,
    ReturnsModule,
    AuthModule,
    RbacModule,
  ],
  controllers: [LogisticsController],
  providers: [
    MockCarrierAdapter,
    LogisticsFulfillmentService,
    LogisticsShipmentsService,
    LogisticsCarrierService,
    LogisticsDeliveryService,
    LogisticsReverseService,
    LogisticsChargesService,
  ],
  exports: [
    MockCarrierAdapter,
    LogisticsFulfillmentService,
    LogisticsShipmentsService,
    LogisticsCarrierService,
    LogisticsDeliveryService,
    LogisticsReverseService,
    LogisticsChargesService,
  ],
})
export class LogisticsModule {}
