import { Module, forwardRef } from '@nestjs/common';
import { PosController } from './pos.controller.js';
import { PosService } from './pos.service.js';
import { PosCheckoutService } from './pos-checkout.service.js';
import { PosSyncService } from './pos-sync.service.js';
import { WorkCentersModule } from '../work-centers/work-centers.module.js';
import { WarehouseModule } from '../warehouse/warehouse.module.js';
import { PricingModule } from '../pricing/pricing.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { InvoicingModule } from '../invoicing/invoicing.module.js';
import { PaymentsModule } from '../payments/payments.module.js';
import { CustomersModule } from '../customers/customers.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { OutboxModule } from '../infrastructure/outbox/outbox.module.js';
import { TenancyModule } from '../tenancy/tenancy.module.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { PosCatalogService } from './pos-catalog.service.js';
import { SalesTicketsService } from './sales-tickets.service.js';
import { SalesTicketsController, StaffDayController } from './sales-tickets.controller.js';
import { RbacModule } from '../rbac/rbac.module.js';

@Module({
  imports: [
    WorkCentersModule,
    WarehouseModule,
    PricingModule,
    OrdersModule,
    InventoryModule,
    InvoicingModule,
    forwardRef(() => PaymentsModule),
    CustomersModule,
    AuditModule,
    OutboxModule,
    TenancyModule,
    RbacModule,
    CatalogModule,
  ],
  controllers: [PosController, SalesTicketsController, StaffDayController],
  providers: [PosService, PosCheckoutService, PosSyncService, PosCatalogService, SalesTicketsService],
  exports: [PosService, SalesTicketsService, PosCheckoutService, PosSyncService],
})
export class PosModule {}
