import {
  Injectable,
  Optional,
} from '@nestjs/common';
import type {
  CalculatePutAwayRequest,
  CalculatePutAwayResponse,
} from '@stokrova/contracts';
import {
  rankPutAwayCandidates,
  type PutAwayCandidateLocation,
  type DomainTemperatureClass,
  type DomainHazmatClass,
  type DomainAbcVelocityClass,
} from '@stokrova/domain';
import { WarehousesService } from './warehouses.service.js';
import { LocationsService } from './locations.service.js';
import { ZonesService } from './zones.service.js';
import { PutawayRulesService } from './putaway-rules.service.js';
import { StockLedgerService } from '../inventory/stock-ledger.service.js';
import { VariantsService } from '../catalog/variants.service.js';

@Injectable()
export class PutawayService {
  constructor(
    private readonly warehousesService: WarehousesService,
    private readonly locationsService: LocationsService,
    private readonly zonesService: ZonesService,
    private readonly rulesService: PutawayRulesService,
    @Optional() private readonly stockLedgerService?: StockLedgerService,
    @Optional() private readonly variantsService?: VariantsService,
  ) {}

  async calculatePutAway(
    tenantId: string,
    req: CalculatePutAwayRequest,
  ): Promise<CalculatePutAwayResponse> {
    // 1. Verify warehouse exists in tenant
    await this.warehousesService.getWarehouseById(tenantId, req.warehouse_id);

    // 2. Fetch all locations for the warehouse
    const locations = await this.locationsService.getLocations(
      tenantId,
      req.warehouse_id,
    );

    // 3. Fetch all storage zones for the warehouse
    const zones = await this.zonesService.getZones(tenantId, req.warehouse_id);
    const zoneMap = new Map(zones.map((z) => [z.id, z]));

    // 4. Resolve preferred zone via rule engine if not explicitly provided
    let preferredZoneId = req.preferred_zone_id ?? null;
    if (!preferredZoneId) {
      const matchingRule = await this.rulesService.findMatchingRule(
        tenantId,
        req.warehouse_id,
        {
          temperatureClass: req.temperature_class,
          hazmatClass: req.hazmat_class,
          velocityClass: req.velocity_class,
        },
      );
      if (matchingRule?.destination_zone_id) {
        preferredZoneId = matchingRule.destination_zone_id;
      }
    }

    // 5. Query stock balances for current bin occupancy
    const balancesByLocation = new Map<
      string,
      Array<{ variant_id: string; batch_id: string | null; on_hand_quantity: number }>
    >();

    if (this.stockLedgerService) {
      const balances = await this.stockLedgerService.getBalances(tenantId, {
        warehouse_id: req.warehouse_id,
      });

      for (const b of balances) {
        if (b.location_id && b.on_hand_quantity > 0) {
          const list = balancesByLocation.get(b.location_id) || [];
          list.push({
            variant_id: b.variant_id,
            batch_id: b.batch_id,
            on_hand_quantity: b.on_hand_quantity,
          });
          balancesByLocation.set(b.location_id, list);
        }
      }
    }

    // 6. Map locations to PutAwayCandidateLocation entries
    const candidates: PutAwayCandidateLocation[] = [];

    for (const loc of locations) {
      const parentZone = loc.zone_id ? zoneMap.get(loc.zone_id) : undefined;
      const locBalances = balancesByLocation.get(loc.id) || [];

      // Collect existing SKUs/variants and batches
      const existingSkusSet = new Set<string>();
      for (const b of locBalances) {
        existingSkusSet.add(b.variant_id);
        if (this.variantsService) {
          try {
            const v = await this.variantsService.getVariantById(tenantId, b.variant_id);
            if (v?.sku) {
              existingSkusSet.add(v.sku);
            }
          } catch {
            // Variant lookup fallback
          }
        }
      }

      const existingBatches = Array.from(
        new Set(
          locBalances
            .filter((b) => b.batch_id !== null)
            .map((b) => b.batch_id!),
        ),
      );

      const zoneTemp = (parentZone?.temperature_class ?? 'AMBIENT') as DomainTemperatureClass;
      const zoneHazmat = (parentZone?.hazmat_class ?? 'NONE') as DomainHazmatClass;

      candidates.push({
        id: loc.id,
        code: loc.code,
        name: loc.name,
        type: loc.type,
        level: loc.level,
        is_active: loc.is_active,
        mix_policy: loc.mix_policy,
        max_weight_kg: loc.max_weight_kg,
        max_volume_cm3: loc.max_volume_cm3,
        zone_id: loc.zone_id ?? null,
        velocity_class: loc.velocity_class ?? null,
        temperature_class: zoneTemp,
        hazmat_class: zoneHazmat,
        existing_skus: Array.from(existingSkusSet),
        existing_batches: existingBatches,
      });
    }

    // 7. Execute pure domain put-away ranking engine
    const rankingResponse = rankPutAwayCandidates(
      {
        variant_id: req.variant_id,
        sku: req.sku,
        quantity: req.quantity,
        unit_weight_kg: req.unit_weight_kg,
        unit_volume_cm3: req.unit_volume_cm3,
        temperature_class: (req.temperature_class ?? 'AMBIENT') as DomainTemperatureClass,
        hazmat_class: (req.hazmat_class ?? 'NONE') as DomainHazmatClass,
        velocity_class: req.velocity_class as DomainAbcVelocityClass | undefined,
        batch_id: req.batch_id,
        preferred_zone_id: preferredZoneId,
      },
      candidates,
    );

    return rankingResponse;
  }
}
