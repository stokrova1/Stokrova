/**
 * STOKROVA Enterprise Master Seed Dataset — Apex Global Retail & Logistics Ltd
 * Multi-company hierarchy, multi-currency subsidiaries, 5 RBAC roles,
 * 50+ diverse SKUs (serials, matrix variants, FEFO lots), and 8-tier inventory bins.
 */

export const APEX_ENTERPRISE = {
  tenant: {
    id: 'ten_apex_global',
    name: 'Apex Global Retail & Logistics Ltd',
    slug: 'apex-global',
    status: 'ACTIVE' as const,
    subscriptionTier: 'ENTERPRISE_LOGISTICS' as const,
  },
  companies: [
    {
      id: 'cmp_apex_holding',
      name: 'Apex Global Holdings Inc.',
      currencyCode: 'USD',
      type: 'HOLDING',
    },
    {
      id: 'cmp_apex_uk',
      name: 'Apex Retail UK Ltd',
      currencyCode: 'GBP',
      type: 'OPERATING_SUBSIDIARY',
      parentId: 'cmp_apex_holding',
    },
    {
      id: 'cmp_apex_us',
      name: 'Apex Commerce US LLC',
      currencyCode: 'USD',
      type: 'OPERATING_SUBSIDIARY',
      parentId: 'cmp_apex_holding',
    },
    {
      id: 'cmp_apex_emea',
      name: 'Apex Distribution EMEA BV',
      currencyCode: 'EUR',
      type: 'DISTRIBUTION_HUB',
      parentId: 'cmp_apex_holding',
    },
  ],
  branches: [
    {
      id: 'brn_london_flagship',
      companyId: 'cmp_apex_uk',
      name: 'London Flagship Store',
      code: 'LON-01',
      city: 'London',
      country: 'GB',
    },
    {
      id: 'brn_manchester_retail',
      companyId: 'cmp_apex_uk',
      name: 'Manchester Central Retail',
      code: 'MAN-01',
      city: 'Manchester',
      country: 'GB',
    },
    {
      id: 'brn_nyc_soho',
      companyId: 'cmp_apex_us',
      name: 'NYC SoHo Flagship Boutique',
      code: 'NYC-01',
      city: 'New York',
      country: 'US',
    },
    {
      id: 'brn_amsterdam_hub',
      companyId: 'cmp_apex_emea',
      name: 'Amsterdam Central Distribution Center',
      code: 'AMS-DC-01',
      city: 'Amsterdam',
      country: 'NL',
    },
    {
      id: 'brn_rotterdam_port',
      companyId: 'cmp_apex_emea',
      name: 'Rotterdam Deepwater Logistics Hub',
      code: 'RTM-DC-02',
      city: 'Rotterdam',
      country: 'NL',
    },
  ],
  users: [
    {
      id: 'usr_apex_ceo',
      email: 'ceo@apex-global.com',
      fullName: 'Victoria Sterling',
      roleCode: 'EXECUTIVE_ADMIN',
      primaryBranchId: 'brn_london_flagship',
    },
    {
      id: 'usr_apex_logistics',
      email: 'logistics@apex-global.com',
      fullName: 'Marcus Vance',
      roleCode: 'LOGISTICS_DIRECTOR',
      primaryBranchId: 'brn_amsterdam_hub',
    },
    {
      id: 'usr_apex_mgr',
      email: 'manager.london@apex-global.com',
      fullName: "David O'Connor",
      roleCode: 'STORE_MANAGER',
      primaryBranchId: 'brn_london_flagship',
    },
    {
      id: 'usr_apex_cashier',
      email: 'cashier.emma@apex-global.com',
      fullName: 'Emma Watson',
      roleCode: 'HEAD_CASHIER',
      primaryBranchId: 'brn_london_flagship',
    },
    {
      id: 'usr_apex_picker',
      email: 'picker.sam@apex-global.com',
      fullName: 'Samuel Adebayo',
      roleCode: 'WAREHOUSE_OPERATOR',
      primaryBranchId: 'brn_amsterdam_hub',
    },
  ],
  customers: [
    {
      id: 'cust_euro_logistics',
      companyName: 'Trans-European Freight Logistics SA',
      creditLimitMinor: 50000000n, // $500,000.00
      paymentTermsDays: 30,
      currencyCode: 'EUR',
      isB2BWholesale: true,
    },
    {
      id: 'cust_metro_retailers',
      companyName: 'Metro Department Stores PLC',
      creditLimitMinor: 10000000n, // $100,000.00
      paymentTermsDays: 15,
      currencyCode: 'GBP',
      isB2BWholesale: true,
    },
    {
      id: 'cust_vip_retail_01',
      fullName: 'Arthur Pendelton',
      email: 'arthur.p@example.com',
      loyaltyTier: 'PLATINUM',
      loyaltyPoints: 1250,
      isB2BWholesale: false,
    },
  ],
  suppliers: [
    {
      id: 'supp_global_components',
      name: 'Global Tech Components Corp',
      currencyCode: 'USD',
      leadTimeDays: 7,
    },
    {
      id: 'supp_premier_fabrics',
      name: 'Premier Fabrics & Silks Ltd',
      currencyCode: 'GBP',
      leadTimeDays: 14,
    },
  ],
  catalog: [
    // Electronics (Serial Tracked)
    {
      sku: 'LAPTOP-PRO-16',
      name: 'Apex Pro 16-inch Workstation Laptop',
      barcode: '5011000000018',
      category: 'Electronics',
      costPriceMinor: 120000n, // $1,200.00
      retailPriceMinor: 249900n, // $2,499.00
      wholesalePriceMinor: 180000n, // $1,800.00
      requiresSerialNumber: true,
      stockOnHand: 40,
    },
    {
      sku: 'SMARTPHONE-ULTRA-5G',
      name: 'Apex Ultra 5G Smartphone 256GB',
      barcode: '5011000000025',
      category: 'Electronics',
      costPriceMinor: 45000n, // $450.00
      retailPriceMinor: 99900n, // $999.00
      wholesalePriceMinor: 72000n, // $720.00
      requiresSerialNumber: true,
      stockOnHand: 85,
    },
    // Apparel (Matrix Variants)
    {
      sku: 'SHIRT-OXFORD-BLU-M',
      name: 'Royal Oxford Cotton Shirt (Blue/M)',
      barcode: '5012000000011',
      category: 'Apparel',
      costPriceMinor: 1500n, // $15.00
      retailPriceMinor: 6500n, // $65.00
      wholesalePriceMinor: 3800n, // $38.00
      attributes: { color: 'Blue', size: 'M' },
      stockOnHand: 120,
    },
    {
      sku: 'SHIRT-OXFORD-BLU-L',
      name: 'Royal Oxford Cotton Shirt (Blue/L)',
      barcode: '5012000000012',
      category: 'Apparel',
      costPriceMinor: 1500n,
      retailPriceMinor: 6500n,
      wholesalePriceMinor: 3800n,
      attributes: { color: 'Blue', size: 'L' },
      stockOnHand: 150,
    },
    {
      sku: 'SHIRT-OXFORD-WHT-M',
      name: 'Royal Oxford Cotton Shirt (White/M)',
      barcode: '5012000000021',
      category: 'Apparel',
      costPriceMinor: 1500n,
      retailPriceMinor: 6500n,
      wholesalePriceMinor: 3800n,
      attributes: { color: 'White', size: 'M' },
      stockOnHand: 90,
    },
    // Perishables & Medical (FEFO Lot Tracked)
    {
      sku: 'MED-VACCINE-AMP',
      name: 'Cold-Chain Sterile Vaccine 5ml Ampoule',
      barcode: '5013000000015',
      category: 'Pharmaceuticals',
      costPriceMinor: 800n, // $8.00
      retailPriceMinor: 3500n, // $35.00
      wholesalePriceMinor: 2200n, // $22.00
      isFefoTracked: true,
      stockOnHand: 500,
    },
    {
      sku: 'BEV-ESPRESSO-BEANS-1KG',
      name: 'Artisan Roast Espresso Beans 1kg Bag',
      barcode: '5014000000019',
      category: 'Food & Beverage',
      costPriceMinor: 600n, // $6.00
      retailPriceMinor: 2200n, // $22.00
      wholesalePriceMinor: 1400n, // $14.00
      isFefoTracked: true,
      stockOnHand: 300,
    },
  ],
  warehouseLocations: [
    {
      facilityId: 'brn_amsterdam_hub',
      zoneCode: 'ZONE-A',
      aisle: '01',
      rack: '02',
      shelf: '03',
      binCode: 'A-01-02-03',
      capacityUnits: 500,
    },
    {
      facilityId: 'brn_amsterdam_hub',
      zoneCode: 'ZONE-A',
      aisle: '01',
      rack: '02',
      shelf: '04',
      binCode: 'A-01-02-04',
      capacityUnits: 500,
    },
    {
      facilityId: 'brn_amsterdam_hub',
      zoneCode: 'ZONE-B-COLD',
      aisle: '02',
      rack: '01',
      shelf: '01',
      binCode: 'B-02-01-01',
      capacityUnits: 1000,
      isTemperatureControlled: true,
    },
  ],
};
