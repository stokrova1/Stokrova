import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ApiConfigModule } from './config/api-config.module.js';
import { DatabaseModule } from './infrastructure/database/database.module.js';
import { RedisModule } from './infrastructure/redis/redis.module.js';
import { StorageModule } from './infrastructure/storage/storage.module.js';
import { IdempotencyModule } from './infrastructure/idempotency/idempotency.module.js';
import { OutboxModule } from './infrastructure/outbox/outbox.module.js';
import { ObservabilityModule } from './infrastructure/observability/observability.module.js';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware.js';

import { HealthModule } from './health/health.module.js';
import { AuthModule } from './auth/auth.module.js';
import { TenancyModule } from './tenancy/tenancy.module.js';
import { RbacModule } from './rbac/rbac.module.js';
import { WorkCentersModule } from './work-centers/work-centers.module.js';
import { WorkflowsModule } from './workflows/workflows.module.js';
import { RulesModule } from './rules/rules.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { DevicesModule } from './devices/devices.module.js';
import { AuditModule } from './audit/audit.module.js';
import { SyncModule } from './sync/sync.module.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { WarehouseModule } from './warehouse/warehouse.module.js';
import { TrackingModule } from './tracking/tracking.module.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { PricingModule } from './pricing/pricing.module.js';
import { PosModule } from './pos/pos.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { ProcurementModule } from './procurement/procurement.module.js';
import { ManufacturingModule } from './manufacturing/manufacturing.module.js';
import { CustomersModule } from './customers/customers.module.js';
import { QuotationsModule } from './quotations/quotations.module.js';
import { InvoicingModule } from './invoicing/invoicing.module.js';
import { ReturnsModule } from './returns/returns.module.js';
import { ReplenishmentModule } from './replenishment/replenishment.module.js';
import { DeliveryModule } from './delivery/delivery.module.js';
import { FinanceModule } from './finance/finance.module.js';
import { IntegrationsModule } from './integrations/integrations.module.js';
import { AnalyticsModule } from './analytics/analytics.module.js';
import { SearchReportingModule } from './search-reporting/search-reporting.module.js';
import { HardwareModule } from './hardware/hardware.module.js';
import { FiscalModule } from './fiscal/fiscal.module.js';
import { B2bModule } from './b2b/b2b.module.js';
import { LoyaltyGiftCardsModule } from './loyalty-giftcards/loyalty-giftcards.module.js';
import { EdiModule } from './edi/edi.module.js';
import { CrmModule } from './crm/crm.module.js';
import { LogisticsModule } from './logistics/logistics.module.js';
import { BillingModule } from './billing/billing.module.js';
import { PlatformAdminModule } from './platform-admin/platform-admin.module.js';

@Module({
  imports: [
    ApiConfigModule,
    DatabaseModule,
    RedisModule,
    StorageModule,
    IdempotencyModule,
    OutboxModule,
    ObservabilityModule,
    HealthModule,
    AuthModule,
    TenancyModule,
    RbacModule,
    WorkCentersModule,
    WorkflowsModule,
    RulesModule,
    PaymentsModule,
    DevicesModule,
    AuditModule,
    SyncModule,
    CatalogModule,
    WarehouseModule,
    TrackingModule,
    InventoryModule,
    PricingModule,
    PosModule,
    OrdersModule,
    ProcurementModule,
    ManufacturingModule,
    CustomersModule,
    QuotationsModule,
    InvoicingModule,
    ReturnsModule,
    ReplenishmentModule,
    DeliveryModule,
    FinanceModule,
    IntegrationsModule,
    AnalyticsModule,
    SearchReportingModule,
    HardwareModule,
    FiscalModule,
    B2bModule,
    LoyaltyGiftCardsModule,
    EdiModule,
    CrmModule,
    LogisticsModule,
    BillingModule,
    PlatformAdminModule,
  ],

})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
