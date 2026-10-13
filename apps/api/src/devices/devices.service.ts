import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  DeviceResponse,
  RegisterDeviceRequest,
  RevokeDeviceRequest,
  DeviceStatus,
  DevicePlatform,
} from '@stokrova/contracts';

export interface StoredDevice {
  id: string;
  tenant_id: string;
  branch_id: string | null;
  device_name: string;
  platform: DevicePlatform;
  app_version: string;
  status: DeviceStatus;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class DevicesService {
  private readonly devices = new Map<string, StoredDevice>();

  async registerDevice(
    tenantId: string,
    req: RegisterDeviceRequest,
  ): Promise<DeviceResponse> {
    if (!tenantId) {
      throw new BadRequestException('tenant_id is required');
    }

    const deviceId = req.device_id || `dev_${randomUUID()}`;
    const now = new Date().toISOString();

    // Check if device with this ID already exists
    const existing = this.devices.get(deviceId);
    if (existing) {
      if (existing.tenant_id !== tenantId) {
        throw new ConflictException('Device ID belongs to a different tenant');
      }
      // If already registered for this tenant, update details and reactivation if pending
      existing.device_name = req.device_name;
      existing.platform = req.platform;
      existing.app_version = req.app_version;
      existing.branch_id = req.branch_id ?? existing.branch_id;
      existing.updated_at = now;
      existing.last_seen_at = now;
      return this.mapToResponse(existing);
    }

    const newDevice: StoredDevice = {
      id: deviceId,
      tenant_id: tenantId,
      branch_id: req.branch_id ?? null,
      device_name: req.device_name,
      platform: req.platform,
      app_version: req.app_version,
      status: 'ACTIVE',
      last_seen_at: now,
      created_at: now,
      updated_at: now,
    };

    this.devices.set(deviceId, newDevice);
    return this.mapToResponse(newDevice);
  }

  async revokeDevice(
    tenantId: string,
    deviceId: string,
    _req?: RevokeDeviceRequest,
  ): Promise<DeviceResponse> {
    const device = this.devices.get(deviceId);
    if (!device || device.tenant_id !== tenantId) {
      throw new NotFoundException(`Device ${deviceId} not found in tenant ${tenantId}`);
    }

    device.status = 'REVOKED';
    device.updated_at = new Date().toISOString();

    return this.mapToResponse(device);
  }

  async validateDeviceActive(tenantId: string, deviceId: string): Promise<boolean> {
    const device = this.devices.get(deviceId);
    if (!device || device.tenant_id !== tenantId) {
      return false;
    }
    return device.status === 'ACTIVE';
  }

  async getDeviceById(tenantId: string, deviceId: string): Promise<DeviceResponse> {
    const device = this.devices.get(deviceId);
    if (!device || device.tenant_id !== tenantId) {
      throw new NotFoundException(`Device ${deviceId} not found`);
    }
    return this.mapToResponse(device);
  }

  async listDevices(tenantId: string): Promise<DeviceResponse[]> {
    return Array.from(this.devices.values())
      .filter((d) => d.tenant_id === tenantId)
      .map((d) => this.mapToResponse(d));
  }

  async updateLastSeen(tenantId: string, deviceId: string): Promise<void> {
    const device = this.devices.get(deviceId);
    if (device && device.tenant_id === tenantId) {
      device.last_seen_at = new Date().toISOString();
      device.updated_at = new Date().toISOString();
    }
  }

  clear(): void {
    this.devices.clear();
  }

  private mapToResponse(device: StoredDevice): DeviceResponse {
    return {
      id: device.id,
      tenant_id: device.tenant_id,
      branch_id: device.branch_id,
      device_name: device.device_name,
      platform: device.platform,
      app_version: device.app_version,
      status: device.status,
      last_seen_at: device.last_seen_at,
      created_at: device.created_at,
      updated_at: device.updated_at,
    };
  }
}
