import { Injectable, Logger } from '@nestjs/common';

export interface CarrierRateQuote {
  serviceId: string;
  serviceCode: string;
  carrierName: string;
  costMinor: string;
  currency: string;
  estimatedTransitDays: number;
}

export interface BookingResult {
  trackingNumber: string;
  labelUrl: string;
  carrierFeeMinor: string;
}

export interface CarrierProviderAdapter {
  quoteRates(
    destinationZip: string,
    weightGrams: number,
    packageCount: number,
    currency?: string,
  ): Promise<CarrierRateQuote[]>;
  bookShipment(
    shipmentNumber: string,
    serviceCode: string,
    operationId: string,
  ): Promise<BookingResult>;
  cancelBooking(trackingNumber: string): Promise<boolean>;
}

@Injectable()
export class MockCarrierAdapter implements CarrierProviderAdapter {
  private readonly logger = new Logger(MockCarrierAdapter.name);
  private shouldSimulateTimeout = false;
  private shouldSimulateNetworkError = false;
  private readonly bookedOperations = new Map<string, BookingResult>();
  private trackingSequence = 50001;

  setSimulateTimeout(enabled: boolean): void {
    this.shouldSimulateTimeout = enabled;
  }

  setSimulateNetworkError(enabled: boolean): void {
    this.shouldSimulateNetworkError = enabled;
  }

  async quoteRates(
    _destinationZip: string,
    weightGrams: number,
    _packageCount: number,
    currency = 'USD',
  ): Promise<CarrierRateQuote[]> {
    const baseWeightKg = Math.max(1, Math.ceil(weightGrams / 1000));
    const baseMinor = baseWeightKg * 800; // $8.00/kg

    return [
      {
        serviceId: 'srv_std',
        serviceCode: 'STANDARD_GROUND',
        carrierName: 'Global Freight Express',
        costMinor: String(baseMinor),
        currency,
        estimatedTransitDays: 3,
      },
      {
        serviceId: 'srv_exp',
        serviceCode: 'EXPRESS_PRIORITY',
        carrierName: 'Global Freight Express',
        costMinor: String(baseMinor * 2),
        currency,
        estimatedTransitDays: 1,
      },
    ];
  }

  async bookShipment(
    shipmentNumber: string,
    serviceCode: string,
    operationId: string,
  ): Promise<BookingResult> {
    if (this.shouldSimulateTimeout) {
      this.logger.warn(`Simulating carrier provider timeout for operation ${operationId}`);
      throw new Error(`Carrier API timed out after 5000ms`);
    }

    if (this.shouldSimulateNetworkError) {
      this.logger.warn(`Simulating carrier provider network error for operation ${operationId}`);
      throw new Error(`Carrier network connection reset by peer`);
    }

    // Idempotent recovery
    const existing = this.bookedOperations.get(operationId);
    if (existing) {
      return existing;
    }

    const trackingNumber = `TRK-${serviceCode.slice(0, 3)}-${this.trackingSequence++}`;
    const result: BookingResult = {
      trackingNumber,
      labelUrl: `https://storage.stokrova.internal/labels/${shipmentNumber}.pdf`,
      carrierFeeMinor: serviceCode === 'EXPRESS_PRIORITY' ? '1600' : '800',
    };

    this.bookedOperations.set(operationId, result);
    return result;
  }

  async cancelBooking(trackingNumber: string): Promise<boolean> {
    this.logger.log(`Cancelled carrier booking for tracking ${trackingNumber}`);
    return true;
  }
}
