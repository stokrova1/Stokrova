import { DurableMap } from '../infrastructure/database/durable-map.js';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  Routing,
  RoutingOperation,
  CreateRoutingRequest,
} from '@stokrova/contracts';
import { generateUuidV7 } from '@stokrova/domain';
import { MfgWorkCentersService } from './mfg-work-centers.service.js';

@Injectable()
export class RoutingsService {
  private routingsStore = new DurableMap<Routing>('routings');
  private routingCounter = 3000;

  constructor(private readonly workCentersService: MfgWorkCentersService) {}

  async createRouting(tenantId: string, request: CreateRoutingRequest): Promise<Routing> {
    if (!request.operations || request.operations.length === 0) {
      throw new BadRequestException('Routing must contain at least one operation.');
    }

    // Verify all work centers exist
    for (const op of request.operations) {
      await this.workCentersService.getWorkCenterById(tenantId, op.work_center_id);
    }

    const routingId = generateUuidV7();
    this.routingCounter += 1;
    const routingNumber = `ROUT-${this.routingCounter}`;
    const now = new Date().toISOString();

    const createdOps: RoutingOperation[] = request.operations.map((op) => ({
      id: generateUuidV7(),
      tenant_id: tenantId,
      routing_id: routingId,
      operation_number: op.operation_number,
      name: op.name.trim(),
      work_center_id: op.work_center_id,
      setup_time_minutes: op.setup_time_minutes ?? 0,
      run_time_minutes_per_unit: op.run_time_minutes_per_unit,
      teardown_time_minutes: op.teardown_time_minutes ?? 0,
      description: op.description ?? null,
      created_at: now,
      updated_at: now,
    }));

    createdOps.sort((a, b) => a.operation_number - b.operation_number);

    const routing: Routing = {
      id: routingId,
      tenant_id: tenantId,
      routing_number: routingNumber,
      name: request.name.trim(),
      variant_id: request.variant_id ?? null,
      is_active: request.is_active ?? true,
      notes: request.notes ?? null,
      created_at: now,
      updated_at: now,
      operations: createdOps,
    };

    this.routingsStore.set(`${tenantId}:${routingId}`, routing);
    return routing;
  }

  async getRoutingById(tenantId: string, id: string): Promise<Routing> {
    const routing = this.routingsStore.get(`${tenantId}:${id}`);
    if (!routing) {
      throw new NotFoundException(`Routing '${id}' not found for tenant '${tenantId}'.`);
    }
    return routing;
  }

  async listRoutings(tenantId: string): Promise<Routing[]> {
    const routings: Routing[] = [];
    for (const [key, r] of this.routingsStore.entries()) {
      if (key.startsWith(`${tenantId}:`)) {
        routings.push(r);
      }
    }
    return routings;
  }
}
