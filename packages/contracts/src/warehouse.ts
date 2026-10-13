export type LocationType =
  | 'RECEIVING'
  | 'INTERNAL_STORAGE'
  | 'PICKING_FACE'
  | 'STAGING'
  | 'DISPATCH'
  | 'QUARANTINE'
  | 'DAMAGED'
  | 'SCRAP'
  | 'CUSTOMER'
  | 'SUPPLIER'
  | 'TRANSIT';

export type BinMixPolicy = 'SINGLE_SKU' | 'MULTI_SKU' | 'SINGLE_BATCH';

export interface Warehouse {
  id: string;
  tenant_id: string;
  branch_id: string;
  code: string;
  name: string;
  address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StorageLocation {
  id: string;
  tenant_id: string;
  warehouse_id: string;
  parent_id: string | null;
  code: string;
  name: string;
  type: LocationType;
  materialized_path: string;
  level: number;
  mix_policy: BinMixPolicy;
  max_weight_kg: number | null;
  max_volume_cm3: number | null;
  is_pickable: boolean;
  is_active: boolean;
  zone_id?: string | null;
  velocity_class?: string | null;
  aisle?: number | null;
  rack?: number | null;
  shelf?: number | null;
  bin_position?: number | null;
  created_at: string;
  updated_at: string;
}

// ----------------------------------------------------------------------------
// DTO Requests & Responses
// ----------------------------------------------------------------------------

export interface CreateWarehouseRequest {
  branch_id: string;
  code: string;
  name: string;
  address?: string;
}

export interface UpdateWarehouseRequest {
  name?: string;
  address?: string;
  is_active?: boolean;
}

export interface WarehouseResponse {
  warehouse: Warehouse;
}

export interface ListWarehousesResponse {
  warehouses: Warehouse[];
}

export interface CreateStorageLocationRequest {
  warehouse_id: string;
  parent_id?: string | null;
  code: string;
  name: string;
  type: LocationType;
  mix_policy?: BinMixPolicy;
  max_weight_kg?: number | null;
  max_volume_cm3?: number | null;
  is_pickable?: boolean;
  zone_id?: string | null;
  velocity_class?: string | null;
  aisle?: number | null;
  rack?: number | null;
  shelf?: number | null;
  bin_position?: number | null;
}

export interface UpdateStorageLocationRequest {
  name?: string;
  parent_id?: string | null;
  type?: LocationType;
  mix_policy?: BinMixPolicy;
  max_weight_kg?: number | null;
  max_volume_cm3?: number | null;
  is_pickable?: boolean;
  is_active?: boolean;
  zone_id?: string | null;
  velocity_class?: string | null;
  aisle?: number | null;
  rack?: number | null;
  shelf?: number | null;
  bin_position?: number | null;
}

export interface StorageLocationResponse {
  location: StorageLocation;
}

export interface ListStorageLocationsResponse {
  locations: StorageLocation[];
}

export interface StorageLocationNode extends StorageLocation {
  children: StorageLocationNode[];
}

export interface StorageLocationTreeResponse {
  locations: StorageLocationNode[];
}
