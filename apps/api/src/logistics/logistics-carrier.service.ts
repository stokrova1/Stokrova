import {
  Injectable,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  QuoteShippingRequest,
  ShippingQuoteResponse,
  ShippingQuote,
} from '@stokrova/contracts';
import { QuoteShippingSchema } from '@stokrova/validation';
import { MockCarrierAdapter } from './adapters/carrier.adapter.js';

@Injectable()
export class LogisticsCarrierService {
  private quoteSeq = 1001;

  constructor(private readonly carrierAdapter: MockCarrierAdapter) {}

  async quoteRates(
    tenantId: string,
    req: QuoteShippingRequest,
  ): Promise<ShippingQuoteResponse> {
    const parsed = QuoteShippingSchema.parse(req);

    const adapterQuotes = await this.carrierAdapter.quoteRates(
      parsed.destination_postal_code,
      parsed.total_weight_grams,
      parsed.package_count,
      parsed.currency,
    );

    const now = new Date();
    const expiry = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // 24hr quote expiry

    const quotes: ShippingQuote[] = adapterQuotes.map((q) => ({
      id: `qte_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      tenant_id: tenantId,
      quote_number: `QTE-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${this.quoteSeq++}`,
      service_id: q.serviceId,
      service_code: q.serviceCode,
      carrier_name: q.carrierName,
      cost_minor: q.costMinor,
      currency: q.currency,
      estimated_transit_days: q.estimatedTransitDays,
      expires_at: expiry,
      parameters: {
        destination_postal_code: parsed.destination_postal_code,
        total_weight_grams: parsed.total_weight_grams,
        package_count: parsed.package_count,
      },
      created_at: now.toISOString(),
    }));

    return { quotes };
  }
}
