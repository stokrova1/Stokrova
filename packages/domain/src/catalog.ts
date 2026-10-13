export type DomainUnitCategory = 'COUNT' | 'MASS' | 'VOLUME' | 'LENGTH' | 'AREA';

export interface DomainUnitOfMeasure {
  id: string;
  code: string;
  name: string;
  category: DomainUnitCategory;
  is_base_unit: boolean;
}

export interface DomainUnitConversion {
  from_uom_id: string;
  to_uom_id: string;
  multiplier: number;
  divisor: number;
}

export interface DomainCategoryHierarchy {
  id: string;
  parent_id: string | null;
  code: string;
  materialized_path: string;
}

export class CatalogDomainError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'CatalogDomainError';
  }
}

/**
 * Validates that conversion multiplier and divisor are strictly positive finite numbers.
 */
export function assertValidConversionFactors(multiplier: number, divisor: number = 1): void {
  if (!Number.isFinite(multiplier) || multiplier <= 0) {
    throw new CatalogDomainError('INVALID_CONVERSION_MULTIPLIER', 'Conversion multiplier must be a finite positive number');
  }
  if (!Number.isFinite(divisor) || divisor <= 0) {
    throw new CatalogDomainError('INVALID_CONVERSION_DIVISOR', 'Conversion divisor must be a finite positive number');
  }
}

/**
 * Calculates exact rational conversion between two units of measure.
 * Supports direct conversion, reverse conversion, or 2-hop conversion via a common base unit.
 */
export function convertQuantity(params: {
  quantity: number;
  from_uom: DomainUnitOfMeasure;
  to_uom: DomainUnitOfMeasure;
  conversions: DomainUnitConversion[];
}): { target_quantity: number; effective_factor: number } {
  const { quantity, from_uom, to_uom, conversions } = params;

  if (quantity < 0) {
    throw new CatalogDomainError('NEGATIVE_QUANTITY_NOT_ALLOWED', 'Conversion quantity cannot be negative');
  }

  // Same unit: identity
  if (from_uom.id === to_uom.id) {
    return { target_quantity: quantity, effective_factor: 1 };
  }

  // Cross-category conversion prohibited (e.g. cannot convert Kg to Liters without density)
  if (from_uom.category !== to_uom.category) {
    throw new CatalogDomainError(
      'INCOMPATIBLE_UOM_CATEGORY',
      `Cannot convert between ${from_uom.category} and ${to_uom.category}`
    );
  }

  // 1. Direct path: from -> to
  const direct = conversions.find(c => c.from_uom_id === from_uom.id && c.to_uom_id === to_uom.id);
  if (direct) {
    assertValidConversionFactors(direct.multiplier, direct.divisor);
    const factor = direct.multiplier / direct.divisor;
    return {
      target_quantity: quantity * factor,
      effective_factor: factor,
    };
  }

  // 2. Reverse path: to -> from (reciprocal)
  const reverse = conversions.find(c => c.from_uom_id === to_uom.id && c.to_uom_id === from_uom.id);
  if (reverse) {
    assertValidConversionFactors(reverse.multiplier, reverse.divisor);
    const factor = reverse.divisor / reverse.multiplier;
    return {
      target_quantity: quantity * factor,
      effective_factor: factor,
    };
  }

  // 3. Two-hop path via a shared intermediate unit (e.g. Carton -> Piece -> Box)
  for (const c1 of conversions) {
    if (c1.from_uom_id === from_uom.id) {
      const intermediateId = c1.to_uom_id;
      const c2 = conversions.find(c => c.from_uom_id === intermediateId && c.to_uom_id === to_uom.id);
      if (c2) {
        assertValidConversionFactors(c1.multiplier, c1.divisor);
        assertValidConversionFactors(c2.multiplier, c2.divisor);
        const factor1 = c1.multiplier / c1.divisor;
        const factor2 = c2.multiplier / c2.divisor;
        const effective_factor = factor1 * factor2;
        return {
          target_quantity: quantity * effective_factor,
          effective_factor,
        };
      }

      // c2 might be reverse intermediate -> to (i.e. to -> intermediate)
      const c2Rev = conversions.find(c => c.from_uom_id === to_uom.id && c.to_uom_id === intermediateId);
      if (c2Rev) {
        assertValidConversionFactors(c1.multiplier, c1.divisor);
        assertValidConversionFactors(c2Rev.multiplier, c2Rev.divisor);
        const factor1 = c1.multiplier / c1.divisor;
        const factor2 = c2Rev.divisor / c2Rev.multiplier;
        const effective_factor = factor1 * factor2;
        return {
          target_quantity: quantity * effective_factor,
          effective_factor,
        };
      }
    }
  }

  throw new CatalogDomainError(
    'NO_UOM_CONVERSION_PATH',
    `No conversion path found between ${from_uom.code} and ${to_uom.code}`
  );
}

/**
 * Calculates a normalized materialized path for a category tree node.
 */
export function calculateMaterializedCategoryPath(parentPath: string | null, code: string): string {
  const cleanCode = code.trim().toUpperCase();
  if (cleanCode.includes('/')) {
    throw new CatalogDomainError('INVALID_CATEGORY_CODE', 'Category code cannot contain path separator "/"');
  }
  if (!parentPath) {
    return cleanCode;
  }
  return `${parentPath.trim().toUpperCase()}/${cleanCode}`;
}

/**
 * Validates that category hierarchy does not contain circular references.
 */
export function validateCategoryAcyclicity(
  categoryId: string,
  newParentId: string | null,
  categoryLookup: (id: string) => { parent_id: string | null } | undefined
): void {
  if (!newParentId) return;

  if (categoryId === newParentId) {
    throw new CatalogDomainError('CATEGORY_SELF_PARENT_FORBIDDEN', 'Category cannot be its own parent');
  }

  let currentId: string | null = newParentId;
  const visited = new Set<string>();

  while (currentId) {
    if (currentId === categoryId) {
      throw new CatalogDomainError('CATEGORY_CYCLE_DETECTED', 'Circular reference detected in category hierarchy');
    }
    if (visited.has(currentId)) {
      throw new CatalogDomainError('CATEGORY_CYCLE_DETECTED', 'Existing loop detected in category hierarchy');
    }
    visited.add(currentId);
    const parent = categoryLookup(currentId);
    currentId = parent?.parent_id ?? null;
  }
}

/**
 * Generates an SEO-friendly URL slug from a category or brand name.
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ----------------------------------------------------------------------------
// Phase 2B: Product Matrix, SKU, Barcode & Variant Domain Logic
// ----------------------------------------------------------------------------

export interface DomainDimensionInput {
  dimension_code: string;
  value_codes: string[];
}

export interface DomainPriceAdjustment {
  attribute_code: string;
  value_code: string;
  delta_selling_minor?: bigint;
  delta_cost_minor?: bigint;
}

export interface DomainGeneratedVariant {
  sku: string;
  attributes: Record<string, string>;
  cost_price_minor: bigint;
  selling_price_minor: bigint;
}

/**
 * Normalizes SKU and ensures it satisfies format invariants.
 * Allowed: uppercase alphanumeric, underscores, hyphens.
 */
export function normalizeSku(sku: string): string {
  const clean = sku.trim().toUpperCase();
  if (!clean || clean.length < 1 || clean.length > 50) {
    throw new CatalogDomainError('INVALID_SKU_LENGTH', 'SKU must be between 1 and 50 characters');
  }
  if (!/^[A-Z0-9_\-\.]+$/.test(clean)) {
    throw new CatalogDomainError('INVALID_SKU_CHARACTERS', 'SKU may only contain alphanumeric characters, hyphens, periods and underscores');
  }
  return clean;
}

/**
 * Validates EAN-13 barcode checksum using standard Modulo-10 algorithm.
 */
export function validateEan13(barcode: string): boolean {
  if (!/^\d{13}$/.test(barcode)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = Number(barcode[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === Number(barcode[12]);
}

/**
 * Validates UPC-A barcode checksum using standard Modulo-10 algorithm.
 */
export function validateUpcA(barcode: string): boolean {
  if (!/^\d{12}$/.test(barcode)) return false;
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    const digit = Number(barcode[i]);
    sum += i % 2 === 0 ? digit * 3 : digit;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === Number(barcode[11]);
}

/**
 * Validates barcode format (EAN-13, UPC-A, Code128 alphanumeric).
 */
export function validateBarcode(barcode: string): {
  valid: boolean;
  format: 'EAN13' | 'UPCA' | 'CODE128';
  error?: string;
} {
  const clean = barcode.trim();
  if (!clean || clean.length < 3 || clean.length > 64) {
    return { valid: false, format: 'CODE128', error: 'Barcode length must be between 3 and 64 characters' };
  }

  if (/^\d{13}$/.test(clean)) {
    const valid = validateEan13(clean);
    return { valid, format: 'EAN13', error: valid ? undefined : 'Invalid EAN-13 check digit' };
  }

  if (/^\d{12}$/.test(clean)) {
    const valid = validateUpcA(clean);
    return { valid, format: 'UPCA', error: valid ? undefined : 'Invalid UPC-A check digit' };
  }

  // Alphanumeric standard code (Code128 / Code39)
  if (/^[A-Za-z0-9_\-\.\:\/]+$/.test(clean)) {
    return { valid: true, format: 'CODE128' };
  }

  return { valid: false, format: 'CODE128', error: 'Barcode contains unsupported characters' };
}

/**
 * Ensures variant attribute coordinates are unique and do not collide with existing variants.
 */
export function assertUniqueVariantCoordinates(
  existingVariants: Array<{ attributes: Record<string, string> }>,
  candidateAttributes: Record<string, string>,
): void {
  const serializeCoords = (attrs: Record<string, string>): string => {
    return Object.keys(attrs)
      .sort()
      .map((k) => `${k.toUpperCase()}=${attrs[k]?.toUpperCase()}`)
      .join(';');
  };

  const candidateKey = serializeCoords(candidateAttributes);
  for (const existing of existingVariants) {
    if (serializeCoords(existing.attributes) === candidateKey) {
      throw new CatalogDomainError(
        'DUPLICATE_VARIANT_ATTRIBUTES',
        `A variant with the attribute combination (${candidateKey}) already exists for this template`
      );
    }
  }
}

/**
 * Universal Cartesian Matrix Generator for variant combinations with delta pricing and collision-free SKU generation.
 */
export function generateVariantMatrix(params: {
  template_code: string;
  dimensions: DomainDimensionInput[];
  base_cost_price_minor: bigint;
  base_selling_price_minor: bigint;
  price_adjustments?: DomainPriceAdjustment[];
}): DomainGeneratedVariant[] {
  const {
    template_code,
    dimensions,
    base_cost_price_minor,
    base_selling_price_minor,
    price_adjustments = [],
  } = params;

  const normalizedTemplate = template_code.trim().toUpperCase();

  if (dimensions.length === 0) {
    return [
      {
        sku: normalizeSku(normalizedTemplate),
        attributes: {},
        cost_price_minor: base_cost_price_minor,
        selling_price_minor: base_selling_price_minor,
      },
    ];
  }

  // Check dimension duplicates
  const dimCodes = new Set<string>();
  for (const dim of dimensions) {
    const code = dim.dimension_code.trim().toUpperCase();
    if (dimCodes.has(code)) {
      throw new CatalogDomainError('DUPLICATE_DIMENSION_IN_MATRIX', `Dimension ${code} specified multiple times`);
    }
    dimCodes.add(code);
    if (!dim.value_codes || dim.value_codes.length === 0) {
      throw new CatalogDomainError('EMPTY_DIMENSION_VALUES', `Dimension ${code} must contain at least one value`);
    }
  }

  // Cartesian product
  let combinations: Array<Record<string, string>> = [{}];

  for (const dim of dimensions) {
    const dimCode = dim.dimension_code.trim().toUpperCase();
    const nextCombos: Array<Record<string, string>> = [];
    const uniqueVals = Array.from(new Set(dim.value_codes.map((v) => v.trim().toUpperCase())));

    for (const combo of combinations) {
      for (const val of uniqueVals) {
        nextCombos.push({
          ...combo,
          [dimCode]: val,
        });
      }
    }
    combinations = nextCombos;
  }

  // Build variants
  return combinations.map((comb) => {
    // Generate SKU: TEMPLATE-VAL1-VAL2
    const sortedVals = Object.keys(comb)
      .sort()
      .map((k) => comb[k]);
    const rawSku = `${normalizedTemplate}-${sortedVals.join('-')}`;
    const sku = normalizeSku(rawSku);

    // Calculate prices with deltas
    let cost = base_cost_price_minor;
    let selling = base_selling_price_minor;

    for (const [attrCode, valCode] of Object.entries(comb)) {
      for (const adj of price_adjustments) {
        if (
          adj.attribute_code.trim().toUpperCase() === attrCode &&
          adj.value_code.trim().toUpperCase() === valCode
        ) {
          if (adj.delta_cost_minor) cost += adj.delta_cost_minor;
          if (adj.delta_selling_minor) selling += adj.delta_selling_minor;
        }
      }
    }

    if (cost < 0n) cost = 0n;
    if (selling < 0n) selling = 0n;

    return {
      sku,
      attributes: comb,
      cost_price_minor: cost,
      selling_price_minor: selling,
    };
  });
}
