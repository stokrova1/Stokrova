import { DurableMap } from '../infrastructure/database/durable-map.js';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  InterCompanyTransfer,
  InterCompanyTransferItem,
  CreateInterCompanyTransferRequest,
} from '@stokrova/contracts';
import { CreateInterCompanyTransferSchema } from '@stokrova/validation';
import {
  assertValidInterCompanyTransfer,
  assertInterCompanyTransition,
  generateInterCompanyMirrorJournalLines,
  IntegrationsDomainError,
} from '@stokrova/domain';
import { WarehousesService } from '../warehouse/warehouses.service.js';
import { GeneralLedgerService } from '../finance/general-ledger.service.js';

@Injectable()
export class InterCompanyService {
  private readonly transfers = new DurableMap<InterCompanyTransfer>('inter_company_transfers');

  constructor(
    private readonly warehousesService: WarehousesService,
    private readonly glService: GeneralLedgerService,
  ) {}

  async createTransfer(
    tenantId: string,
    req: CreateInterCompanyTransferRequest,
  ): Promise<InterCompanyTransfer> {
    const parsed = CreateInterCompanyTransferSchema.parse(req);

    // Validate warehouse ownership
    await this.warehousesService.getWarehouseById(tenantId, parsed.source_warehouse_id);
    await this.warehousesService.getWarehouseById(tenantId, parsed.destination_warehouse_id);

    // Validate entities and items math
    let totalMath: { total_amount_minor: string };
    try {
      totalMath = assertValidInterCompanyTransfer(
        parsed.source_company_id,
        parsed.destination_company_id,
        parsed.items,
      );
    } catch (err: unknown) {
      if (err instanceof IntegrationsDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    const now = new Date().toISOString();
    const transferId = randomUUID();
    const transferNumber = `ICT-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

    const items: InterCompanyTransferItem[] = parsed.items.map((i) => ({
      id: randomUUID(),
      variant_id: i.variant_id,
      sku: i.sku,
      quantity: i.quantity,
      unit_transfer_price_minor: i.unit_transfer_price_minor,
      subtotal_minor: (BigInt(i.unit_transfer_price_minor) * BigInt(i.quantity)).toString(),
    }));

    const transfer: InterCompanyTransfer = {
      id: transferId,
      tenant_id: tenantId,
      transfer_number: transferNumber,
      source_company_id: parsed.source_company_id,
      source_warehouse_id: parsed.source_warehouse_id,
      destination_company_id: parsed.destination_company_id,
      destination_warehouse_id: parsed.destination_warehouse_id,
      status: 'PROPOSED',
      total_amount_minor: totalMath.total_amount_minor,
      currency: (parsed.currency ?? 'USD').toUpperCase(),
      items,
      source_sales_order_id: null,
      destination_purchase_order_id: null,
      source_journal_entry_id: null,
      destination_journal_entry_id: null,
      elimination_journal_entry_id: null,
      created_at: now,
      updated_at: now,
    };

    this.transfers.set(transfer.id, transfer);
    return transfer;
  }

  async approveTransfer(
    tenantId: string,
    transferId: string,
  ): Promise<InterCompanyTransfer> {
    const transfer = await this.getTransferById(tenantId, transferId);
    assertInterCompanyTransition(transfer.status, 'APPROVED');

    transfer.status = 'APPROVED';
    transfer.updated_at = new Date().toISOString();
    return transfer;
  }

  async dispatchTransfer(
    tenantId: string,
    transferId: string,
  ): Promise<InterCompanyTransfer> {
    const transfer = await this.getTransferById(tenantId, transferId);
    assertInterCompanyTransition(transfer.status, 'IN_TRANSIT');

    transfer.status = 'IN_TRANSIT';
    transfer.updated_at = new Date().toISOString();
    return transfer;
  }

  /**
   * Completes transfer and posts paired mirror journal entries + consolidation elimination:
   * Source Entity: Dr IC Receivable, Cr Revenue
   * Destination Entity: Dr Inventory, Cr IC Payable
   */
  async completeTransfer(
    tenantId: string,
    transferId: string,
    accounts?: {
      sellerReceivableAccountId: string;
      sellerRevenueAccountId: string;
      buyerAssetAccountId: string;
      buyerPayableAccountId: string;
      eliminationPayableAccountId?: string;
      eliminationReceivableAccountId?: string;
    },
  ): Promise<InterCompanyTransfer> {
    const transfer = await this.getTransferById(tenantId, transferId);
    assertInterCompanyTransition(transfer.status, 'COMPLETED');

    if (accounts) {
      const mirrorLines = generateInterCompanyMirrorJournalLines({
        transferAmountMinor: transfer.total_amount_minor,
        sellerReceivableAccountId: accounts.sellerReceivableAccountId,
        sellerRevenueAccountId: accounts.sellerRevenueAccountId,
        buyerAssetAccountId: accounts.buyerAssetAccountId,
        buyerPayableAccountId: accounts.buyerPayableAccountId,
        eliminationPayableAccountId: accounts.eliminationPayableAccountId ?? accounts.buyerPayableAccountId,
        eliminationReceivableAccountId: accounts.eliminationReceivableAccountId ?? accounts.sellerReceivableAccountId,
        transferNumber: transfer.transfer_number,
      });

      // Post seller journal entry
      const sellerJe = await this.glService.createJournalEntry(tenantId, {
        company_id: transfer.source_company_id,
        posting_date: new Date().toISOString(),
        narration: `Inter-company sale for transfer ${transfer.transfer_number}`,
        source_type: 'MANUAL',
        source_id: transfer.id,
        currency: transfer.currency,
        lines: mirrorLines.sellerLines,
      });

      // Post buyer journal entry
      const buyerJe = await this.glService.createJournalEntry(tenantId, {
        company_id: transfer.destination_company_id,
        posting_date: new Date().toISOString(),
        narration: `Inter-company purchase for transfer ${transfer.transfer_number}`,
        source_type: 'MANUAL',
        source_id: transfer.id,
        currency: transfer.currency,
        lines: mirrorLines.buyerLines,
      });

      transfer.source_journal_entry_id = sellerJe.id;
      transfer.destination_journal_entry_id = buyerJe.id;
    }

    transfer.status = 'COMPLETED';
    transfer.updated_at = new Date().toISOString();
    return transfer;
  }

  async getTransferById(
    tenantId: string,
    transferId: string,
  ): Promise<InterCompanyTransfer> {
    const transfer = this.transfers.get(transferId);
    if (!transfer || transfer.tenant_id !== tenantId) {
      throw new NotFoundException(`Inter-company transfer '${transferId}' not found.`);
    }
    return transfer;
  }

  async listTransfers(tenantId: string): Promise<InterCompanyTransfer[]> {
    return Array.from(this.transfers.values()).filter((t) => t.tenant_id === tenantId);
  }
}
