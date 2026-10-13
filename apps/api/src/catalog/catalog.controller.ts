import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { UomService } from './uom.service.js';
import { CategoriesService } from './categories.service.js';
import { BrandsService } from './brands.service.js';
import { TemplatesService } from './templates.service.js';
import { AttributesService } from './attributes.service.js';
import { VariantsService } from './variants.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator.js';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator.js';
import {
  CreateUomSchema,
  CreateUnitConversionSchema,
  ConvertQuantitySchema,
  CreateCategorySchema,
  UpdateCategorySchema,
  CreateBrandSchema,
  UpdateBrandSchema,
  CreateProductTemplateSchema,
  UpdateProductTemplateSchema,
  CreateAttributeDimensionSchema,
  CreateAttributeValueSchema,
  MatrixGenerateSchema,
  CreateProductVariantSchema,
  UpdateProductVariantSchema,
} from '@stokrova/validation';
import type {
  UomResponse,
  ListUomResponse,
  CreateUomRequest,
  UnitConversionResponse,
  CreateUnitConversionRequest,
  ConvertQuantityRequest,
  ConvertQuantityResponse,
  CategoryResponse,
  CategoryTreeResponse,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  BrandResponse,
  ListBrandsResponse,
  CreateBrandRequest,
  UpdateBrandRequest,
  UnitCategory,
  ProductTemplateResponse,
  ListProductTemplatesResponse,
  CreateProductTemplateRequest,
  UpdateProductTemplateRequest,
  AttributeDimensionResponse,
  ListAttributeDimensionsResponse,
  CreateAttributeDimensionRequest,
  AttributeValueResponse,
  ListAttributeValuesResponse,
  CreateAttributeValueRequest,
  MatrixGenerateRequest,
  MatrixGenerateResponse,
  ProductVariantResponse,
  ListProductVariantsResponse,
  CreateProductVariantRequest,
  UpdateProductVariantRequest,
  ProductType,
  BarcodeLookupResponse,
} from '@stokrova/contracts';
import { StandardPermissions } from '@stokrova/domain';

@Controller('catalog')
@UseGuards(AuthGuard, TenantGuard, RbacGuard)
export class CatalogController {
  constructor(
    private readonly uomService: UomService,
    private readonly categoriesService: CategoriesService,
    private readonly brandsService: BrandsService,
    private readonly templatesService: TemplatesService,
    private readonly attributesService: AttributesService,
    private readonly variantsService: VariantsService,
  ) {}

  // --------------------------------------------------------------------------
  // Units of Measure & Conversions
  // --------------------------------------------------------------------------

  @Post('uom')
  @RequirePermission(StandardPermissions.CATALOG_MANAGE)
  async createUom(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<UomResponse> {
    const parseResult = CreateUomSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid unit of measure creation payload.',
          details: parseResult.error.format(),
        },
      });
    }

    const uom = await this.uomService.createUom(
      tenantId,
      parseResult.data as CreateUomRequest,
    );
    return { uom };
  }

  @Get('uom')
  @RequirePermission(StandardPermissions.CATALOG_VIEW)
  async getUoms(
    @CurrentTenant() tenantId: string,
    @Query('category') category?: UnitCategory,
  ): Promise<ListUomResponse> {
    const uoms = await this.uomService.getUoms(tenantId, category);
    return { uoms };
  }

  @Get('uom/:id')
  @RequirePermission(StandardPermissions.CATALOG_VIEW)
  async getUom(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<UomResponse> {
    const uom = await this.uomService.getUomById(tenantId, id);
    return { uom };
  }

  @Post('uom/conversions')
  @RequirePermission(StandardPermissions.CATALOG_MANAGE)
  async createConversion(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<UnitConversionResponse> {
    const parseResult = CreateUnitConversionSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid unit conversion payload.',
          details: parseResult.error.format(),
        },
      });
    }

    const conversion = await this.uomService.createConversion(
      tenantId,
      parseResult.data as CreateUnitConversionRequest,
    );
    return { conversion };
  }

  @Get('uom/conversions')
  @RequirePermission(StandardPermissions.CATALOG_VIEW)
  async getConversions(
    @CurrentTenant() tenantId: string,
    @Query('uom_id') uomId?: string,
  ) {
    const conversions = await this.uomService.getConversions(tenantId, uomId);
    return { conversions };
  }

  @Post('uom/convert')
  @RequirePermission(StandardPermissions.CATALOG_VIEW)
  async convertQuantity(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<ConvertQuantityResponse> {
    const parseResult = ConvertQuantitySchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid quantity conversion payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.uomService.convertQuantity(
      tenantId,
      parseResult.data as ConvertQuantityRequest,
    );
  }

  // --------------------------------------------------------------------------
  // Categories & Hierarchies
  // --------------------------------------------------------------------------

  @Post('categories')
  @RequirePermission(StandardPermissions.CATALOG_MANAGE)
  async createCategory(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<CategoryResponse> {
    const parseResult = CreateCategorySchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid category creation payload.',
          details: parseResult.error.format(),
        },
      });
    }

    const category = await this.categoriesService.createCategory(
      tenantId,
      parseResult.data as CreateCategoryRequest,
    );
    return { category };
  }

  @Get('categories/tree')
  @RequirePermission(StandardPermissions.CATALOG_VIEW)
  async getCategoryTree(
    @CurrentTenant() tenantId: string,
  ): Promise<CategoryTreeResponse> {
    const categories = await this.categoriesService.getCategoryTree(tenantId);
    return { categories };
  }

  @Get('categories')
  @RequirePermission(StandardPermissions.CATALOG_VIEW)
  async getCategories(
    @CurrentTenant() tenantId: string,
    @Query('parent_id') parentId?: string,
  ) {
    const categories = await this.categoriesService.getCategories(
      tenantId,
      parentId === 'null' ? null : parentId,
    );
    return { categories };
  }

  @Get('categories/:id')
  @RequirePermission(StandardPermissions.CATALOG_VIEW)
  async getCategory(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<CategoryResponse> {
    const category = await this.categoriesService.getCategoryById(tenantId, id);
    return { category };
  }

  @Patch('categories/:id')
  @RequirePermission(StandardPermissions.CATALOG_MANAGE)
  async updateCategory(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<CategoryResponse> {
    const parseResult = UpdateCategorySchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid category update payload.',
          details: parseResult.error.format(),
        },
      });
    }

    const category = await this.categoriesService.updateCategory(
      tenantId,
      id,
      parseResult.data as UpdateCategoryRequest,
    );
    return { category };
  }

  // --------------------------------------------------------------------------
  // Brands
  // --------------------------------------------------------------------------

  @Post('brands')
  @RequirePermission(StandardPermissions.CATALOG_MANAGE)
  async createBrand(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<BrandResponse> {
    const parseResult = CreateBrandSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid brand creation payload.',
          details: parseResult.error.format(),
        },
      });
    }

    const brand = await this.brandsService.createBrand(
      tenantId,
      parseResult.data as CreateBrandRequest,
    );
    return { brand };
  }

  @Get('brands')
  @RequirePermission(StandardPermissions.CATALOG_VIEW)
  async getBrands(
    @CurrentTenant() tenantId: string,
    @Query('active_only') activeOnly?: string,
  ): Promise<ListBrandsResponse> {
    const brands = await this.brandsService.getBrands(
      tenantId,
      activeOnly === 'true',
    );
    return { brands };
  }

  @Get('brands/:id')
  @RequirePermission(StandardPermissions.CATALOG_VIEW)
  async getBrand(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<BrandResponse> {
    const brand = await this.brandsService.getBrandById(tenantId, id);
    return { brand };
  }

  @Patch('brands/:id')
  @RequirePermission(StandardPermissions.CATALOG_MANAGE)
  async updateBrand(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<BrandResponse> {
    const parseResult = UpdateBrandSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid brand update payload.',
          details: parseResult.error.format(),
        },
      });
    }

    const brand = await this.brandsService.updateBrand(
      tenantId,
      id,
      parseResult.data as UpdateBrandRequest,
    );
    return { brand };
  }

  // --------------------------------------------------------------------------
  // Phase 2B: Product Templates
  // --------------------------------------------------------------------------

  @Post('templates')
  @RequirePermission(StandardPermissions.CATALOG_MANAGE)
  async createTemplate(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<ProductTemplateResponse> {
    const parseResult = CreateProductTemplateSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid product template creation payload.',
          details: parseResult.error.format(),
        },
      });
    }

    const template = await this.templatesService.createTemplate(
      tenantId,
      parseResult.data as CreateProductTemplateRequest,
    );
    return { template };
  }

  @Get('templates')
  @RequirePermission(StandardPermissions.CATALOG_VIEW)
  async getTemplates(
    @CurrentTenant() tenantId: string,
    @Query('type') type?: ProductType,
  ): Promise<ListProductTemplatesResponse> {
    const templates = await this.templatesService.getTemplates(tenantId, type);
    return { templates };
  }

  @Get('templates/:id')
  @RequirePermission(StandardPermissions.CATALOG_VIEW)
  async getTemplate(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<ProductTemplateResponse> {
    const template = await this.templatesService.getTemplateById(tenantId, id);
    return { template };
  }

  @Patch('templates/:id')
  @RequirePermission(StandardPermissions.CATALOG_MANAGE)
  async updateTemplate(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<ProductTemplateResponse> {
    const parseResult = UpdateProductTemplateSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid product template update payload.',
          details: parseResult.error.format(),
        },
      });
    }

    const template = await this.templatesService.updateTemplate(
      tenantId,
      id,
      parseResult.data as UpdateProductTemplateRequest,
    );
    return { template };
  }

  // --------------------------------------------------------------------------
  // Phase 2B: Attribute Dimensions & Values
  // --------------------------------------------------------------------------

  @Post('attributes/dimensions')
  @RequirePermission(StandardPermissions.CATALOG_MANAGE)
  async createDimension(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<AttributeDimensionResponse> {
    const parseResult = CreateAttributeDimensionSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid attribute dimension creation payload.',
          details: parseResult.error.format(),
        },
      });
    }

    const dimension = await this.attributesService.createDimension(
      tenantId,
      parseResult.data as CreateAttributeDimensionRequest,
    );
    return { dimension };
  }

  @Get('attributes/dimensions')
  @RequirePermission(StandardPermissions.CATALOG_VIEW)
  async getDimensions(
    @CurrentTenant() tenantId: string,
  ): Promise<ListAttributeDimensionsResponse> {
    const dimensions = await this.attributesService.getDimensions(tenantId);
    return { dimensions };
  }

  @Post('attributes/dimensions/:id/values')
  @RequirePermission(StandardPermissions.CATALOG_MANAGE)
  async createValue(
    @CurrentTenant() tenantId: string,
    @Param('id') dimensionId: string,
    @Body() body: unknown,
  ): Promise<AttributeValueResponse> {
    const parseResult = CreateAttributeValueSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid attribute value creation payload.',
          details: parseResult.error.format(),
        },
      });
    }

    const value = await this.attributesService.createValue(
      tenantId,
      dimensionId,
      parseResult.data as CreateAttributeValueRequest,
    );
    return { value };
  }

  @Get('attributes/dimensions/:id/values')
  @RequirePermission(StandardPermissions.CATALOG_VIEW)
  async getValues(
    @CurrentTenant() tenantId: string,
    @Param('id') dimensionId: string,
  ): Promise<ListAttributeValuesResponse> {
    const values = await this.attributesService.getValues(tenantId, dimensionId);
    return { values };
  }

  // --------------------------------------------------------------------------
  // Phase 2B: Variants & Matrix Generation
  // --------------------------------------------------------------------------

  @Post('variants/matrix/generate')
  @RequirePermission(StandardPermissions.CATALOG_MANAGE)
  async generateMatrix(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<MatrixGenerateResponse> {
    const parseResult = MatrixGenerateSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid matrix generation payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.variantsService.generateMatrix(
      tenantId,
      parseResult.data as MatrixGenerateRequest,
    );
  }

  @Post('variants')
  @RequirePermission(StandardPermissions.CATALOG_MANAGE)
  async createVariant(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<ProductVariantResponse> {
    const parseResult = CreateProductVariantSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid product variant creation payload.',
          details: parseResult.error.format(),
        },
      });
    }

    const variant = await this.variantsService.createVariant(
      tenantId,
      parseResult.data as CreateProductVariantRequest,
    );
    return { variant };
  }

  @Get('variants')
  @RequirePermission(StandardPermissions.CATALOG_VIEW)
  async getVariants(
    @CurrentTenant() tenantId: string,
    @Query('template_id') templateId?: string,
  ): Promise<ListProductVariantsResponse> {
    const variants = await this.variantsService.getVariants(tenantId, templateId);
    return { variants };
  }

  @Get('variants/lookup')
  @RequirePermission(StandardPermissions.CATALOG_VIEW)
  async lookupVariant(
    @CurrentTenant() tenantId: string,
    @Query('q') query?: string,
  ): Promise<BarcodeLookupResponse> {
    if (!query) {
      throw new BadRequestException('Query parameter "q" is required for variant lookup.');
    }
    const variant = await this.variantsService.lookupByBarcodeOrSku(tenantId, query);
    if (!variant) {
      return { found: false, variant: null };
    }
    const template = await this.templatesService.getTemplateById(
      tenantId,
      variant.template_id,
    );
    let uomName = 'Unit';
    try {
      const uom = await this.uomService.getUomById(tenantId, template.base_uom_id);
      uomName = uom.name;
    } catch {
      // Fallback
    }
    return {
      found: true,
      variant: {
        id: variant.id,
        template_id: variant.template_id,
        sku: variant.sku,
        barcode: variant.barcode,
        template_name: template.name,
        cost_price_minor: variant.cost_price_minor,
        selling_price_minor: variant.selling_price_minor,
        base_uom_name: uomName,
      },
    };
  }

  @Get('variants/:id')
  @RequirePermission(StandardPermissions.CATALOG_VIEW)
  async getVariant(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<ProductVariantResponse> {
    const variant = await this.variantsService.getVariantById(tenantId, id);
    return { variant };
  }

  @Patch('variants/:id')
  @RequirePermission(StandardPermissions.CATALOG_MANAGE)
  async updateVariant(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<ProductVariantResponse> {
    const parseResult = UpdateProductVariantSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid product variant update payload.',
          details: parseResult.error.format(),
        },
      });
    }

    const variant = await this.variantsService.updateVariant(
      tenantId,
      id,
      parseResult.data as UpdateProductVariantRequest,
    );
    return { variant };
  }
}
