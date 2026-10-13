import { Module } from '@nestjs/common';
import { QuotationsController } from './quotations.controller.js';
import { QuotationsService } from './quotations.service.js';
import { WorkCentersModule } from '../work-centers/work-centers.module.js';
import { WarehouseModule } from '../warehouse/warehouse.module.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { CustomersModule } from '../customers/customers.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { OutboxModule } from '../infrastructure/outbox/outbox.module.js';

@Module({
  imports: [
    WorkCentersModule,
    WarehouseModule,
    CatalogModule,
    CustomersModule,
    OrdersModule,
    AuditModule,
    OutboxModule,
  ],
  controllers: [QuotationsController],
  providers: [QuotationsService],
  exports: [QuotationsService],
})
export class QuotationsModule {}
