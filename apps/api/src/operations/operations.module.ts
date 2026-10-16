import { Injectable, Module, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { RbacModule } from '../rbac/rbac.module.js';
import { InvoicingModule } from '../invoicing/invoicing.module.js';
import { ProcurementModule } from '../procurement/procurement.module.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { TrackingModule } from '../tracking/tracking.module.js';
import { PosModule } from '../pos/pos.module.js';
import { TenancyModule } from '../tenancy/tenancy.module.js';
import { OperationsController } from './operations.controller.js';
import { OperationsService } from './operations.service.js';

/** Hourly check that sends each business's daily summary at its chosen hour. Off in tests / DAILY_SUMMARIES=off. */
@Injectable()
export class DailySummaryScheduler implements OnApplicationBootstrap, OnApplicationShutdown {
  private timer: NodeJS.Timeout | null = null;
  constructor(private readonly ops: OperationsService) {}
  onApplicationBootstrap() {
    if (process.env['NODE_ENV'] === 'test' || process.env['DAILY_SUMMARIES'] === 'off') return;
    this.timer = setInterval(() => void this.ops.runScheduled().catch(() => 0), 60 * 60 * 1000);
    this.timer.unref?.();
  }
  onApplicationShutdown() { if (this.timer) clearInterval(this.timer); }
}

@Module({
  imports: [RbacModule, InvoicingModule, ProcurementModule, CatalogModule, InventoryModule, TrackingModule, PosModule, TenancyModule],
  controllers: [OperationsController],
  providers: [OperationsService, DailySummaryScheduler],
  exports: [OperationsService],
})
export class OperationsModule {}
