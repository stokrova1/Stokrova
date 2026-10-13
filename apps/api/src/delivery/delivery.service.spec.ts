import { describe, it, expect, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { TenancyService } from '../tenancy/tenancy.service.js';
import { WarehousesService } from '../warehouse/warehouses.service.js';
import { FleetService } from './fleet.service.js';
import { DeliveryRoutingService } from './delivery-routing.service.js';
import { PodService } from './pod.service.js';
import { DeliveryController } from './delivery.controller.js';

describe('Fleet Management, Delivery Routing & Proof of Delivery (POD) Engine (Phase 9)', () => {
  let tenancyService: TenancyService;
  let warehousesService: WarehousesService;
  let fleetService: FleetService;
  let routingService: DeliveryRoutingService;
  let podService: PodService;
  let controller: DeliveryController;

  let tenant1Id: string;
  let branch1Id: string;
  let tenant2Id: string;
  let wh1Id: string;

  beforeEach(async () => {
    tenancyService = new TenancyService();
    warehousesService = new WarehousesService(tenancyService);
    fleetService = new FleetService(warehousesService);
    routingService = new DeliveryRoutingService(warehousesService, fleetService);
    podService = new PodService(routingService, fleetService);
    controller = new DeliveryController(fleetService, routingService, podService);

    // Tenant 1
    const t1 = await tenancyService.provisionTenant(
      {
        name: 'Metro Fast Logistics',
        slug: 'metro-fast',
        owner_email: 'fleet@metro.com',
        owner_full_name: 'Metro Director',
        default_currency: 'EUR',
      },
      'usr_metro_1',
    );
    tenant1Id = t1.tenant.id;
    branch1Id = t1.default_branch.id;

    // Tenant 2
    const t2 = await tenancyService.provisionTenant(
      {
        name: 'Apex Courier',
        slug: 'apex-courier',
        owner_email: 'ops@apex.com',
        owner_full_name: 'Apex Ops',
        default_currency: 'USD',
      },
      'usr_apex_courier_1',
    );
    tenant2Id = t2.tenant.id;

    // Warehouse in Tenant 1
    const wh1 = await warehousesService.createWarehouse(tenant1Id, {
      branch_id: branch1Id,
      code: 'WH-METRO-01',
      name: 'Metro Distribution Hub',
    });
    wh1Id = wh1.id;
  });

  // ==========================================================================
  // Sub-Phase 9A: Fleet Vehicles & Driver Shift Management
  // ==========================================================================
  describe('Sub-Phase 9A: Vehicles & Driver Management', () => {
    it('creates, updates and lists fleet vehicles', async () => {
      // 1. Create vehicle
      const created = await fleetService.createVehicle(tenant1Id, {
        warehouse_id: wh1Id,
        vehicle_code: 'VAN-101',
        license_plate: 'EN-884-AB',
        make_model: 'Ford Transit Custom',
        type: 'VAN_CARGO',
        max_payload_grams: 1200000, // 1200 kg
        max_volume_cm3: 10000000,  // 10 m3
        odometer_meters: 15000000,  // 15,000 km
      });

      expect(created.vehicle.id).toBeDefined();
      expect(created.vehicle.vehicle_code).toBe('VAN-101');
      expect(created.vehicle.status).toBe('ACTIVE');
      const vehId = created.vehicle.id;

      // 2. Reject duplicate code and plate
      await expect(
        fleetService.createVehicle(tenant1Id, {
          warehouse_id: wh1Id,
          vehicle_code: 'VAN-101',
          license_plate: 'DIFF-PLATE',
          make_model: 'Other',
          type: 'VAN_CARGO',
          max_payload_grams: 1000000,
          max_volume_cm3: 10000000,
        }),
      ).rejects.toThrow(ConflictException);

      // 3. Update vehicle
      const updated = await fleetService.updateVehicle(tenant1Id, vehId, {
        odometer_meters: 16200000,
        status: 'MAINTENANCE_DUE',
      });
      expect(updated.vehicle.odometer_meters).toBe(16200000);
      expect(updated.vehicle.status).toBe('MAINTENANCE_DUE');

      // 4. List vehicles
      const list = await fleetService.listVehicles(tenant1Id, wh1Id);
      expect(list.vehicles.length).toBe(1);
    });

    it('creates and manages drivers with shift duty transitions', async () => {
      const created = await fleetService.createDriver(tenant1Id, {
        user_id: 'usr_driver_77',
        driver_code: 'DRV-77',
        full_name: 'David Beck',
        phone_number: '+33 6 12 34 56 78',
        license_number: 'FR-DL-998877',
        license_expiry_date: '2028-12-31',
      });

      expect(created.driver.id).toBeDefined();
      expect(created.driver.shift_status).toBe('OFF_DUTY');
      const drvId = created.driver.id;

      // Shift transition to ON_DUTY
      const onDuty = await fleetService.updateDriverShift(tenant1Id, drvId, {
        shift_status: 'ON_DUTY',
      });
      expect(onDuty.driver.shift_status).toBe('ON_DUTY');

      // List drivers
      const list = await fleetService.listDrivers(tenant1Id);
      expect(list.drivers.length).toBe(1);
    });
  });

  // ==========================================================================
  // Sub-Phase 9B: Multi-Stop Route Optimization & Dispatch Runs
  // ==========================================================================
  describe('Sub-Phase 9B: Delivery Runs & Capacity Guard', () => {
    it('creates, optimizes, and dispatches a delivery run within vehicle capacity', async () => {
      // 1. Setup Vehicle & Driver
      const vehRes = await fleetService.createVehicle(tenant1Id, {
        warehouse_id: wh1Id,
        vehicle_code: 'VAN-202',
        license_plate: 'CD-555-EE',
        make_model: 'Renault Master',
        type: 'VAN_CARGO',
        max_payload_grams: 1500000, // 1500 kg
        max_volume_cm3: 12000000,  // 12 m3
      });
      const drvRes = await fleetService.createDriver(tenant1Id, {
        user_id: 'usr_drv_99',
        driver_code: 'DRV-99',
        full_name: 'Mark Taylor',
        phone_number: '+33 6 98 76 54 32',
        license_number: 'FR-DL-112233',
        license_expiry_date: '2029-05-31',
      });

      // 2. Create multi-stop Delivery Run
      const runRes = await routingService.createDeliveryRun(tenant1Id, {
        warehouse_id: wh1Id,
        stops: [
          {
            order_id: 'ord_1',
            order_number: 'SO-1001',
            recipient_name: 'Customer One',
            recipient_phone: '+33 1 00 00 01',
            delivery_address: '15 Rue de Paris, Paris',
            latitude_microdegrees: 48856600,
            longitude_microdegrees: 2352200,
            total_weight_grams: 250000, // 250 kg
            total_volume_cm3: 2000000, // 2 m3
          },
          {
            order_id: 'ord_2',
            order_number: 'SO-1002',
            recipient_name: 'Customer Two',
            recipient_phone: '+33 1 00 00 02',
            delivery_address: '22 Avenue Montaigne, Paris',
            latitude_microdegrees: 48866000,
            longitude_microdegrees: 2307000,
            total_weight_grams: 400000, // 400 kg
            total_volume_cm3: 3000000, // 3 m3
          },
        ],
      });

      expect(runRes.run.id).toBeDefined();
      expect(runRes.run.status).toBe('PLANNING');
      expect(runRes.run.total_weight_grams).toBe(650000);
      const runId = runRes.run.id;

      // 3. Optimize sequence
      const optRes = await routingService.optimizeRun(tenant1Id, runId);
      expect(optRes.run.status).toBe('OPTIMIZED');
      expect(optRes.run.stops[0]?.stop_sequence).toBe(1);
      expect(optRes.run.stops[1]?.stop_sequence).toBe(2);

      // 4. Dispatch Run
      const dispatchRes = await routingService.dispatchRun(tenant1Id, runId, {
        vehicle_id: vehRes.vehicle.id,
        driver_id: drvRes.driver.id,
        notes: 'Priority afternoon route',
      });
      expect(dispatchRes.run.status).toBe('DISPATCHED');
      expect(dispatchRes.run.dispatched_at).toBeDefined();

      // Driver shift automatically becomes EN_ROUTE
      const drvCheck = await fleetService.getDriverById(tenant1Id, drvRes.driver.id);
      expect(drvCheck.driver.shift_status).toBe('EN_ROUTE');

      // 5. Start Transit
      const transitRes = await routingService.startTransit(tenant1Id, runId);
      expect(transitRes.run.status).toBe('IN_TRANSIT');
    });

    it('rejects dispatch when cargo weight exceeds vehicle payload capacity', async () => {
      // Small motorcycle with 50 kg (50,000 g) max payload
      const motoRes = await fleetService.createVehicle(tenant1Id, {
        warehouse_id: wh1Id,
        vehicle_code: 'MOTO-01',
        license_plate: 'MO-111-AA',
        make_model: 'Electric Cargo Bike',
        type: 'MOTORCYCLE_EV',
        max_payload_grams: 50000,
        max_volume_cm3: 500000,
      });

      const drvRes = await fleetService.createDriver(tenant1Id, {
        user_id: 'usr_rider_1',
        driver_code: 'DRV-MOTO-1',
        full_name: 'Rider Dave',
        phone_number: '+33 6 00 11 22 33',
        license_number: 'DL-MOTO-1',
        license_expiry_date: '2027-01-01',
      });

      // Cargo is 100 kg > 50 kg max
      const runRes = await routingService.createDeliveryRun(tenant1Id, {
        warehouse_id: wh1Id,
        stops: [
          {
            order_id: 'ord_heavy',
            order_number: 'SO-HEAVY',
            recipient_name: 'Heavy Customer',
            recipient_phone: '123',
            delivery_address: 'Address',
            total_weight_grams: 100000,
            total_volume_cm3: 200000,
          },
        ],
      });

      await expect(
        routingService.dispatchRun(tenant1Id, runRes.run.id, {
          vehicle_id: motoRes.vehicle.id,
          driver_id: drvRes.driver.id,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // Sub-Phase 9C: Driver Execution, Proof of Delivery (POD) & Run Completion
  // ==========================================================================
  describe('Sub-Phase 9C: Driver Stop Execution & Proof of Delivery', () => {
    it('executes stop arrival, submits valid POD within geofence, and completes run', async () => {
      // 1. Setup active run with 1 stop
      const vehRes = await fleetService.createVehicle(tenant1Id, {
        warehouse_id: wh1Id,
        vehicle_code: 'VAN-303',
        license_plate: 'XY-999-ZZ',
        make_model: 'Peugeot Boxer',
        type: 'VAN_CARGO',
        max_payload_grams: 1000000,
        max_volume_cm3: 8000000,
      });
      const drvRes = await fleetService.createDriver(tenant1Id, {
        user_id: 'usr_drv_pod',
        driver_code: 'DRV-POD-1',
        full_name: 'POD Driver',
        phone_number: '+33 6 11 22 33 44',
        license_number: 'FR-POD-99',
        license_expiry_date: '2028-09-30',
      });

      // Destination coordinates: Paris Place de la Concorde (48.865633, 2.321236 -> 48865633, 2321236)
      const targetLat = 48865633;
      const targetLon = 2321236;

      const runRes = await routingService.createDeliveryRun(tenant1Id, {
        warehouse_id: wh1Id,
        stops: [
          {
            order_id: 'ord_pod_1',
            order_number: 'SO-POD-001',
            recipient_name: 'Claire Dupont',
            recipient_phone: '+33 6 99 88 77 66',
            delivery_address: 'Place de la Concorde, Paris',
            latitude_microdegrees: targetLat,
            longitude_microdegrees: targetLon,
            total_weight_grams: 15000,
            total_volume_cm3: 50000,
          },
        ],
      });
      const runId = runRes.run.id;
      const stopId = runRes.run.stops[0]!.id;

      await routingService.dispatchRun(tenant1Id, runId, {
        vehicle_id: vehRes.vehicle.id,
        driver_id: drvRes.driver.id,
      });
      await routingService.startTransit(tenant1Id, runId);

      // 2. Driver arrives at stop (PENDING -> ARRIVED)
      const arrivalRes = await podService.arriveAtStop(tenant1Id, stopId);
      expect(arrivalRes.stop.status).toBe('ARRIVED');
      expect(arrivalRes.stop.actual_arrival).toBeDefined();

      // 3. Driver submits POD within geofence (~20m away)
      const podRes = await podService.submitPod(tenant1Id, stopId, {
        verification_method: 'SIGNATURE',
        recipient_name: 'Claire Dupont',
        signature_svg: '<svg>valid_signature_path</svg>',
        delivered_latitude_microdegrees: targetLat + 100, // tiny offset ~10m
        delivered_longitude_microdegrees: targetLon + 100,
        notes: 'Delivered directly to front reception',
      });

      expect(podRes.pod.id).toBeDefined();
      expect(podRes.stop.status).toBe('DELIVERED');
      expect(podRes.pod.geofence_distance_meters).toBeLessThan(100);

      // 4. Run should automatically transition to COMPLETED and driver released to ON_DUTY
      const runCheck = await routingService.getRunById(tenant1Id, runId);
      expect(runCheck.run.status).toBe('COMPLETED');
      expect(runCheck.run.completed_stops).toBe(1);

      const drvCheck = await fleetService.getDriverById(tenant1Id, drvRes.driver.id);
      expect(drvCheck.driver.shift_status).toBe('ON_DUTY');

      // 5. Query POD
      const retrievedPod = await podService.getPodByStopId(tenant1Id, stopId);
      expect(retrievedPod.recipient_name).toBe('Claire Dupont');
    });

    it('rejects POD when driver location breaches geofence threshold', async () => {
      const vehRes = await fleetService.createVehicle(tenant1Id, {
        warehouse_id: wh1Id,
        vehicle_code: 'VAN-GEO',
        license_plate: 'GEO-01-AA',
        make_model: 'Ford Transit',
        type: 'VAN_CARGO',
        max_payload_grams: 1000000,
        max_volume_cm3: 8000000,
      });
      const drvRes = await fleetService.createDriver(tenant1Id, {
        user_id: 'usr_drv_geo',
        driver_code: 'DRV-GEO',
        full_name: 'Geo Driver',
        phone_number: '123',
        license_number: 'GEO-LIC',
        license_expiry_date: '2028-01-01',
      });

      // Target: Paris (48.856600, 2.352200)
      const targetLat = 48856600;
      const targetLon = 2352200;

      const runRes = await routingService.createDeliveryRun(tenant1Id, {
        warehouse_id: wh1Id,
        stops: [
          {
            order_id: 'ord_geo',
            order_number: 'SO-GEO',
            recipient_name: 'Geo Customer',
            recipient_phone: '123',
            delivery_address: 'Paris Central',
            latitude_microdegrees: targetLat,
            longitude_microdegrees: targetLon,
            total_weight_grams: 5000,
            total_volume_cm3: 10000,
          },
        ],
      });
      const runId = runRes.run.id;
      const stopId = runRes.run.stops[0]!.id;

      await routingService.dispatchRun(tenant1Id, runId, {
        vehicle_id: vehRes.vehicle.id,
        driver_id: drvRes.driver.id,
      });
      await podService.arriveAtStop(tenant1Id, stopId);

      // Attempt POD from 10 kilometers away (e.g. lat offset 90,000 microdegrees ~10km)
      await expect(
        podService.submitPod(tenant1Id, stopId, {
          verification_method: 'SIGNATURE',
          recipient_name: 'Fake Recipient',
          delivered_latitude_microdegrees: targetLat + 90000,
          delivered_longitude_microdegrees: targetLon + 90000,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('handles stop delivery failure exception', async () => {
      const runRes = await routingService.createDeliveryRun(tenant1Id, {
        warehouse_id: wh1Id,
        stops: [
          {
            order_id: 'ord_fail',
            order_number: 'SO-FAIL',
            recipient_name: 'Absent Recipient',
            recipient_phone: '123',
            delivery_address: 'No Access Road',
            total_weight_grams: 1000,
            total_volume_cm3: 5000,
          },
        ],
      });
      const stopId = runRes.run.stops[0]!.id;

      await podService.arriveAtStop(tenant1Id, stopId);
      const failRes = await podService.failStop(tenant1Id, stopId, {
        failure_reason: 'CUSTOMER_UNAVAILABLE',
        notes: 'Security gate locked, customer phone straight to voicemail',
      });

      expect(failRes.stop.status).toBe('ATTEMPTED_FAILED');
      expect(failRes.stop.failure_reason).toBe('CUSTOMER_UNAVAILABLE');
    });
  });

  // ==========================================================================
  // DeliveryController Endpoints
  // ==========================================================================
  describe('DeliveryController Endpoints', () => {
    it('exercises vehicle, driver, and run routes through controller', async () => {
      // 1. Create vehicle via controller
      const vRes = await controller.createVehicle(tenant1Id, {
        warehouse_id: wh1Id,
        vehicle_code: 'CTRL-VAN-1',
        license_plate: 'CTRL-101',
        make_model: 'Mercedes Vito',
        type: 'VAN_CARGO',
        max_payload_grams: 900000,
        max_volume_cm3: 6000000,
      });
      expect(vRes.vehicle.id).toBeDefined();

      // 2. List vehicles
      const vList = await controller.listVehicles(tenant1Id, wh1Id);
      expect(vList.vehicles.length).toBeGreaterThan(0);

      // 3. Create driver via controller
      const dRes = await controller.createDriver(tenant1Id, {
        user_id: 'usr_ctrl_drv',
        driver_code: 'CTRL-DRV-1',
        full_name: 'Controller Driver',
        phone_number: '+44 7700 900999',
        license_number: 'CTRL-LIC-1',
        license_expiry_date: '2029-01-01',
      });
      expect(dRes.driver.id).toBeDefined();

      // 4. Create run via controller
      const rRes = await controller.createDeliveryRun(tenant1Id, {
        warehouse_id: wh1Id,
        stops: [
          {
            order_id: 'ord_c1',
            order_number: 'SO-C1',
            recipient_name: 'Client C1',
            recipient_phone: '123',
            delivery_address: '10 High Street',
            total_weight_grams: 2000,
            total_volume_cm3: 8000,
          },
        ],
      });
      expect(rRes.run.id).toBeDefined();

      // 5. List runs
      const rList = await controller.listRuns(tenant1Id, wh1Id);
      expect(rList.runs.length).toBeGreaterThan(0);

      // 6. Verify multi-tenant isolation
      await expect(
        fleetService.getVehicleById(tenant2Id, vRes.vehicle.id),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
