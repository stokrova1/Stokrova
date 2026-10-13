import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module.js';
import { TenancyModule } from '../tenancy/tenancy.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { WarehouseModule } from '../warehouse/warehouse.module.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { TrackingModule } from '../tracking/tracking.module.js';

import { SuppliersController } from './suppliers.controller.js';
import { SuppliersService } from './suppliers.service.js';

import { PurchaseOrdersController } from './purchase-orders.controller.js';
import { PurchaseOrdersService } from './purchase-orders.service.js';

import { GoodsReceiptController } from './goods-receipt.controller.js';
import { GoodsReceiptService } from './goods-receipt.service.js';

import { LandedCostController } from './landed-cost.controller.js';
import { LandedCostService } from './landed-cost.service.js';

import { PurchaseInvoicesController } from './purchase-invoices.controller.js';
import { PurchaseInvoicesService } from './purchase-invoices.service.js';

import { PurchaseRequestsController } from './purchase-requests.controller.js';
import { PurchaseRequestsService } from './purchase-requests.service.js';

import { RfqsController } from './rfqs.controller.js';
import { RfqsService } from './rfqs.service.js';

import { SupplierQuotationsController } from './supplier-quotations.controller.js';
import { SupplierQuotationsService } from './supplier-quotations.service.js';

import { SupplierReturnsController } from './supplier-returns.controller.js';
import { SupplierReturnsService } from './supplier-returns.service.js';

import { SupplierPaymentsController } from './supplier-payments.controller.js';
import { SupplierPaymentsService } from './supplier-payments.service.js';

@Module({
  imports: [
    CatalogModule,
    TenancyModule,
    RbacModule,
    WarehouseModule,
    InventoryModule,
    TrackingModule,
  ],
  controllers: [
    SuppliersController,
    PurchaseOrdersController,
    GoodsReceiptController,
    LandedCostController,
    PurchaseInvoicesController,
    PurchaseRequestsController,
    RfqsController,
    SupplierQuotationsController,
    SupplierReturnsController,
    SupplierPaymentsController,
  ],
  providers: [
    SuppliersService,
    PurchaseOrdersService,
    GoodsReceiptService,
    LandedCostService,
    PurchaseInvoicesService,
    PurchaseRequestsService,
    RfqsService,
    SupplierQuotationsService,
    SupplierReturnsService,
    SupplierPaymentsService,
  ],
  exports: [
    SuppliersService,
    PurchaseOrdersService,
    GoodsReceiptService,
    LandedCostService,
    PurchaseInvoicesService,
    PurchaseRequestsService,
    RfqsService,
    SupplierQuotationsService,
    SupplierReturnsService,
    SupplierPaymentsService,
  ],
})
export class ProcurementModule {}
