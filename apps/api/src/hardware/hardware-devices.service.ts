import { DurableMap } from '../infrastructure/database/durable-map.js';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  HardwareDevice,
  HardwareProfile,
  CreateHardwareDeviceRequest,
  UpdateHardwareDeviceRequest,
  CreateHardwareProfileRequest,
  HardwareDeviceStatus,
} from '@stokrova/contracts';
import {
  CreateHardwareDeviceSchema,
  UpdateHardwareDeviceSchema,
  CreateHardwareProfileSchema,
} from '@stokrova/validation';

@Injectable()
export class HardwareDevicesService {
  private readonly devices = new DurableMap<HardwareDevice>('hardware_devices');
  private readonly profiles = new DurableMap<HardwareProfile>('hardware_profiles');

  // ==========================================================================
  // Hardware Devices Management
  // ==========================================================================

  async createDevice(
    tenantId: string,
    req: CreateHardwareDeviceRequest,
  ): Promise<HardwareDevice> {
    if (!tenantId) {
      throw new BadRequestException('tenant_id is required');
    }
    const parsed = CreateHardwareDeviceSchema.parse(req);
    const now = new Date().toISOString();
    const id = `hdev_${randomUUID()}`;

    const device: HardwareDevice = {
      id,
      tenant_id: tenantId,
      branch_id: parsed.branch_id ?? null,
      register_id: parsed.register_id ?? null,
      name: parsed.name,
      device_type: parsed.device_type,
      protocol: parsed.protocol,
      connection_interface: parsed.connection_interface,
      ip_address: parsed.ip_address ?? null,
      port: parsed.port ?? null,
      serial_port: parsed.serial_port ?? null,
      baud_rate: parsed.baud_rate ?? null,
      mac_address: parsed.mac_address ?? null,
      profile_id: parsed.profile_id ?? null,
      status: 'ONLINE',
      is_active: true,
      last_heartbeat_at: now,
      created_at: now,
      updated_at: now,
    };

    this.devices.set(device.id, device);
    return device;
  }

  async getDeviceById(
    tenantId: string,
    deviceId: string,
  ): Promise<HardwareDevice> {
    const dev = this.devices.get(deviceId);
    if (!dev || dev.tenant_id !== tenantId) {
      throw new NotFoundException(`Hardware device '${deviceId}' not found`);
    }
    return dev;
  }

  async listDevices(
    tenantId: string,
    filters?: { branch_id?: string; device_type?: string; status?: string },
  ): Promise<HardwareDevice[]> {
    return Array.from(this.devices.values()).filter((d) => {
      if (d.tenant_id !== tenantId) return false;
      if (filters?.branch_id && d.branch_id !== filters.branch_id) return false;
      if (filters?.device_type && d.device_type !== filters.device_type) return false;
      if (filters?.status && d.status !== filters.status) return false;
      return true;
    });
  }

  async updateDevice(
    tenantId: string,
    deviceId: string,
    req: UpdateHardwareDeviceRequest,
  ): Promise<HardwareDevice> {
    const dev = await this.getDeviceById(tenantId, deviceId);
    const parsed = UpdateHardwareDeviceSchema.parse(req);
    const now = new Date().toISOString();

    if (parsed.name !== undefined) dev.name = parsed.name;
    if (parsed.protocol !== undefined) dev.protocol = parsed.protocol;
    if (parsed.connection_interface !== undefined) dev.connection_interface = parsed.connection_interface;
    if (parsed.branch_id !== undefined) dev.branch_id = parsed.branch_id;
    if (parsed.register_id !== undefined) dev.register_id = parsed.register_id;
    if (parsed.ip_address !== undefined) dev.ip_address = parsed.ip_address;
    if (parsed.port !== undefined) dev.port = parsed.port;
    if (parsed.serial_port !== undefined) dev.serial_port = parsed.serial_port;
    if (parsed.baud_rate !== undefined) dev.baud_rate = parsed.baud_rate;
    if (parsed.profile_id !== undefined) dev.profile_id = parsed.profile_id;
    if (parsed.status !== undefined) dev.status = parsed.status;
    if (parsed.is_active !== undefined) dev.is_active = parsed.is_active;
    dev.updated_at = now;

    this.devices.set(dev.id, dev);
    return dev;
  }

  async recordHeartbeat(
    tenantId: string,
    deviceId: string,
    status?: HardwareDeviceStatus,
  ): Promise<HardwareDevice> {
    const dev = await this.getDeviceById(tenantId, deviceId);
    const now = new Date().toISOString();
    dev.last_heartbeat_at = now;
    if (status) {
      dev.status = status;
    }
    dev.updated_at = now;
    this.devices.set(dev.id, dev);
    return dev;
  }

  async deleteDevice(
    tenantId: string,
    deviceId: string,
  ): Promise<{ success: boolean }> {
    const dev = await this.getDeviceById(tenantId, deviceId);
    this.devices.delete(dev.id);
    return { success: true };
  }

  // ==========================================================================
  // Hardware Profiles Management
  // ==========================================================================

  async createProfile(
    tenantId: string,
    req: CreateHardwareProfileRequest,
  ): Promise<HardwareProfile> {
    if (!tenantId) {
      throw new BadRequestException('tenant_id is required');
    }
    const parsed = CreateHardwareProfileSchema.parse(req);
    const now = new Date().toISOString();
    const id = `hprof_${randomUUID()}`;

    const profile: HardwareProfile = {
      id,
      tenant_id: tenantId,
      name: parsed.name,
      device_type: parsed.device_type,
      paper_width_mm: parsed.paper_width_mm ?? 80,
      column_count: parsed.column_count ?? 48,
      drawer_kick_pin: parsed.drawer_kick_pin ?? 2,
      drawer_pulse_duration_ms: parsed.drawer_pulse_duration_ms ?? 100,
      scale_precision_grams: parsed.scale_precision_grams ?? 1,
      created_at: now,
      updated_at: now,
    };

    this.profiles.set(profile.id, profile);
    return profile;
  }

  async getProfileById(
    tenantId: string,
    profileId: string,
  ): Promise<HardwareProfile> {
    const prof = this.profiles.get(profileId);
    if (!prof || prof.tenant_id !== tenantId) {
      throw new NotFoundException(`Hardware profile '${profileId}' not found`);
    }
    return prof;
  }

  async listProfiles(tenantId: string): Promise<HardwareProfile[]> {
    return Array.from(this.profiles.values()).filter((p) => p.tenant_id === tenantId);
  }
}
