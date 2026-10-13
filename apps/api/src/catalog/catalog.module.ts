import { Module } from '@nestjs/common';
import { TenancyModule } from '../tenancy/tenancy.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { UomService } from './uom.service.js';
import { CategoriesService } from './categories.service.js';
import { BrandsService } from './brands.service.js';
import { TemplatesService } from './templates.service.js';
import { AttributesService } from './attributes.service.js';
import { VariantsService } from './variants.service.js';
import { CatalogController } from './catalog.controller.js';

@Module({
  imports: [TenancyModule, RbacModule],
  controllers: [CatalogController],
  providers: [
    UomService,
    CategoriesService,
    BrandsService,
    TemplatesService,
    AttributesService,
    VariantsService,
  ],
  exports: [
    UomService,
    CategoriesService,
    BrandsService,
    TemplatesService,
    AttributesService,
    VariantsService,
  ],
})
export class CatalogModule {}
