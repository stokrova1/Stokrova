import { describe, it, expect, beforeEach } from 'vitest';
import { DevicesService } from './devices.service.js';

describe('DevicesService', () => {
  let service: DevicesService;
  const tenantId = 'ten_lagos_01';

  beforeEach(() => {
    service = new DevicesService();
  });

  it('registers a new device and marks it ACTIVE', async () => {
    const device = await service.registerDevice(tenantId, {
      device_name: 'Counter POS 1',
      platform: 'TAURI_DESKTOP',
      app_version: '1.0.0',
    });

    expect(device.id).toBeDefined();
    expect(device.tenant_id).toBe(tenantId);
    expect(device.device_name).toBe('Counter POS 1');
    expect(device.platform).toBe('TAURI_DESKTOP');
    expect(device.status).toBe('ACTIVE');

    const isActive = await service.validateDeviceActive(tenantId, device.id);
    expect(isActive).toBe(true);
  });

  it('revokes an active device', async () => {
    const device = await service.registerDevice(tenantId, {
      device_name: 'Mobile Tablet 2',
      platform: 'EXPO_MOBILE',
      app_version: '1.1.0',
    });

    const revoked = await service.revokeDevice(tenantId, device.id, {
      reason: 'Device reported lost or compromised',
    });

    expect(revoked.status).toBe('REVOKED');

    const isActive = await service.validateDeviceActive(tenantId, device.id);
    expect(isActive).toBe(false);
  });

  it('rejects device registration across different tenants for the same device ID', async () => {
    const device = await service.registerDevice(tenantId, {
      device_id: 'dev_hardware_fixed_001',
      device_name: 'Fixed Terminal',
      platform: 'TAURI_DESKTOP',
      app_version: '1.0.0',
    });

    await expect(
      service.registerDevice('ten_abuja_02', {
        device_id: device.id,
        device_name: 'Hacked Clone',
        platform: 'TAURI_DESKTOP',
        app_version: '1.0.0',
      }),
    ).rejects.toThrowError(/different tenant/);
  });

  it('lists devices scoped to the authenticated tenant', async () => {
    await service.registerDevice(tenantId, {
      device_name: 'Device A',
      platform: 'TAURI_DESKTOP',
      app_version: '1.0.0',
    });
    await service.registerDevice(tenantId, {
      device_name: 'Device B',
      platform: 'EXPO_MOBILE',
      app_version: '1.0.0',
    });
    await service.registerDevice('ten_other', {
      device_name: 'Other Device',
      platform: 'BROWSER_WEB',
      app_version: '1.0.0',
    });

    const devices = await service.listDevices(tenantId);
    expect(devices).toHaveLength(2);
    expect(devices.map((d) => d.device_name)).toEqual(['Device A', 'Device B']);
  });
});
