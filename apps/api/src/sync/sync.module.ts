import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller.js';
import { SyncService } from './sync.service.js';
import { PosSyncController } from './pos-sync.controller.js';
import { PosSyncService } from './pos-sync.service.js';
import { DevicesModule } from '../devices/devices.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { PosModule } from '../pos/pos.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { PaymentsModule } from '../payments/payments.module.js';
import { InventoryModule } from '../inventory/inventory.module.js';

@Module({
  imports: [
    DevicesModule,
    AuditModule,
    RbacModule,
    PosModule,
    OrdersModule,
    PaymentsModule,
    InventoryModule,
  ],
  controllers: [SyncController, PosSyncController],
  providers: [SyncService, PosSyncService],
  exports: [SyncService, PosSyncService],
})
export class SyncModule {}
