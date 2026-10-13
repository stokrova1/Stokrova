import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import type {
  ParseBarcodeRequest,
  ParseBarcodeResponse,
} from '@stokrova/contracts';
import { ParseBarcodeSchema } from '@stokrova/validation';
import {
  parseGS1Barcode,
  WarehouseOpsDomainError,
} from '@stokrova/domain';

@Injectable()
export class BarcodeLogisticsService {
  async parseBarcode(
    tenantId: string,
    req: ParseBarcodeRequest,
  ): Promise<ParseBarcodeResponse> {
    if (!tenantId) {
      throw new BadRequestException('tenant_id is required');
    }

    const parsed = ParseBarcodeSchema.parse(req);

    try {
      const domainParsed = parseGS1Barcode(parsed.barcode);

      return {
        parsed: {
          raw_barcode: domainParsed.raw_barcode,
          elements: domainParsed.elements,
          gtin: domainParsed.gtin ?? null,
          batch_id: domainParsed.batch_id ?? null,
          expiry_date: domainParsed.expiry_date ?? null,
          serial_number: domainParsed.serial_number ?? null,
          sscc: domainParsed.sscc ?? null,
          weight_grams: domainParsed.weight_grams ?? null,
          count: domainParsed.count ?? null,
        },
      };
    } catch (err: unknown) {
      if (err instanceof WarehouseOpsDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }
}
