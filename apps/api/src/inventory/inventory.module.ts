import { Module } from '@nestjs/common';
import { TenancyModule } from '../tenancy/tenancy.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { WarehouseModule } from '../warehouse/warehouse.module.js';
import { TrackingModule } from '../tracking/tracking.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { OutboxModule } from '../infrastructure/outbox/outbox.module.js';
import { StockLedgerService } from './stock-ledger.service.js';
import { StockReservationsService } from './stock-reservations.service.js';
import { InventoryController } from './inventory.controller.js';

@Module({
  imports: [
    TenancyModule,
    RbacModule,
    CatalogModule,
    WarehouseModule,
    TrackingModule,
    AuditModule,
    OutboxModule,
  ],
  controllers: [InventoryController],
  providers: [StockLedgerService, StockReservationsService],
  exports: [StockLedgerService, StockReservationsService],
})
export class InventoryModule {}
