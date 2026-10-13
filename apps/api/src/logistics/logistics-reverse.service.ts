import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import type {
  ShipmentResponse,
  CreateReshipmentRequest,
} from '@stokrova/contracts';
import { CreateReshipmentSchema } from '@stokrova/validation';
import { LogisticsShipmentsService } from './logistics-shipments.service.js';
import { RmaService } from '../returns/rma.service.js';

@Injectable()
export class LogisticsReverseService {
  constructor(
    private readonly shipmentsService: LogisticsShipmentsService,
    private readonly rmaService: RmaService,
  ) {}

  async initiateReturnToOrigin(
    tenantId: string,
    shipmentId: string,
    reason: string,
  ): Promise<ShipmentResponse> {
    // Transition shipment to RETURNED_TO_ORIGIN
    // Invariant: This action marks physical return in transit, but DOES NOT restore stock or issue refunds.
    return this.shipmentsService.transitionShipmentStatus(
      tenantId,
      shipmentId,
      'RETURNED_TO_ORIGIN',
      `Return to origin initiated: ${reason}`,
    );
  }

  async createRmaFromReturnedShipment(
    tenantId: string,
    shipmentId: string,
    receivingLocationId?: string,
  ): Promise<{ rmaId: string; rmaNumber: string }> {
    const shipment = await this.shipmentsService.getShipmentEntity(tenantId, shipmentId);

    if (shipment.status !== 'RETURNED_TO_ORIGIN') {
      throw new BadRequestException(
        `Shipment '${shipmentId}' status must be RETURNED_TO_ORIGIN to create an RMA. Current: ${shipment.status}`,
      );
    }

    const rmaRes = await this.rmaService.createRma(tenantId, {
      warehouse_id: shipment.warehouse_id,
      type: 'CUSTOMER_RETURN',
      original_order_id: shipment.order_id,
      original_order_number: shipment.shipment_number,
      resolution_preference: 'REPLACEMENT',
      notes: `Generated from returned shipment ${shipment.shipment_number}${receivingLocationId ? ` at location ${receivingLocationId}` : ''}`,
      lines: shipment.lines.map((l) => ({
        variant_id: l.variant_id,
        sku: l.sku,
        item_name: `Returned Item SKU ${l.sku}`,
        quantity_authorized: l.quantity,
        unit_price_cents: 1000,
        currency: 'USD',
        reason_code: 'DAMAGED_IN_TRANSIT',
      })),
    });

    return {
      rmaId: rmaRes.rma.id,
      rmaNumber: rmaRes.rma.rma_number,
    };
  }

  async createReshipment(
    tenantId: string,
    req: CreateReshipmentRequest,
  ): Promise<ShipmentResponse> {
    const parsed = CreateReshipmentSchema.parse(req);
    const originalShipment = await this.shipmentsService.getShipmentEntity(
      tenantId,
      parsed.original_shipment_id,
    );

    // Create a new replacement shipment reusing the same fulfillment and lines
    return this.shipmentsService.createShipment(tenantId, {
      fulfillment_id: originalShipment.fulfillment_id,
      carrier_id: originalShipment.carrier_id,
      carrier_service_id: originalShipment.carrier_service_id,
      packages: originalShipment.packages.map((p) => ({
        package_number: `${p.package_number}-R`,
        weight_grams: p.weight_grams,
        length_cm: p.length_cm,
        width_cm: p.width_cm,
        height_cm: p.height_cm,
        packaging_type: p.packaging_type,
      })),
      lines: originalShipment.lines.map((l) => ({
        fulfillment_line_id: l.fulfillment_line_id,
        variant_id: l.variant_id,
        sku: l.sku,
        quantity: l.quantity,
      })),
    });
  }
}
