import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  LandedCostVoucher,
  LandedCostCharge,
  LandedCostLineAllocation,
  CreateLandedCostVoucherRequest,
} from '@stokrova/contracts';
import {
  allocateLandedCosts,
  generateUuidV7,
} from '@stokrova/domain';
import { GoodsReceiptService } from './goods-receipt.service.js';

@Injectable()
export class LandedCostService {
  private vouchersStore = new Map<string, LandedCostVoucher>();
  private voucherCounter = 2000;

  constructor(private readonly grnService: GoodsReceiptService) {}

  async create(
    tenantId: string,
    request: CreateLandedCostVoucherRequest,
  ): Promise<LandedCostVoucher> {
    if (!request.goods_receipt_ids || request.goods_receipt_ids.length === 0) {
      throw new BadRequestException('Landed cost voucher must reference at least one Goods Receipt.');
    }
    if (!request.charges || request.charges.length === 0) {
      throw new BadRequestException('Landed cost voucher must specify at least one landed charge.');
    }

    // Gather receipt lines from referenced GRNs
    const allLinesToAllocate: {
      goods_receipt_line_id: string;
      variant_id: string;
      received_quantity: number;
      original_line_cost_minor: bigint;
    }[] = [];

    for (const grnId of request.goods_receipt_ids) {
      const grn = await this.grnService.getById(tenantId, grnId);
      if (grn.status !== 'COMPLETED') {
        throw new BadRequestException(
          `Cannot allocate landed costs to incomplete Goods Receipt '${grn.grn_number}' (status: ${grn.status}).`,
        );
      }

      if (grn.lines) {
        for (const line of grn.lines) {
          const qty = line.quantity_accepted;
          if (qty > 0) {
            const unitCost = BigInt(line.unit_cost_minor);
            const originalLineCost = unitCost * BigInt(qty);
            allLinesToAllocate.push({
              goods_receipt_line_id: line.id,
              variant_id: line.variant_id,
              received_quantity: qty,
              original_line_cost_minor: originalLineCost,
            });
          }
        }
      }
    }

    if (allLinesToAllocate.length === 0) {
      throw new BadRequestException('No accepted items found across referenced Goods Receipts to allocate charges against.');
    }

    // Sum charges
    let totalChargesMinor = 0n;
    const voucherId = generateUuidV7();
    const createdCharges: LandedCostCharge[] = [];

    for (const chargeReq of request.charges) {
      const chargeAmount = BigInt(chargeReq.amount_minor);
      totalChargesMinor += chargeAmount;
      createdCharges.push({
        id: generateUuidV7(),
        tenant_id: tenantId,
        voucher_id: voucherId,
        category: chargeReq.category,
        description: chargeReq.description,
        amount_minor: chargeAmount.toString(),
      });
    }

    // Multi-method exact integer allocation with Hamilton-Hare remainder distribution
    const allocationOutputs = allocateLandedCosts(
      request.allocation_method,
      totalChargesMinor,
      allLinesToAllocate,
    );

    const createdAllocations: LandedCostLineAllocation[] = allocationOutputs.map((res) => ({
      id: generateUuidV7(),
      tenant_id: tenantId,
      voucher_id: voucherId,
      goods_receipt_line_id: res.goods_receipt_line_id,
      variant_id: res.variant_id,
      received_quantity: res.received_quantity,
      original_line_cost_minor: res.original_line_cost_minor.toString(),
      allocated_charge_minor: res.allocated_charge_minor.toString(),
      final_line_cost_minor: res.final_line_cost_minor.toString(),
      unit_landed_cost_minor: res.unit_landed_cost_minor.toString(),
    }));

    this.voucherCounter += 1;
    const now = new Date().toISOString();
    const voucher: LandedCostVoucher = {
      id: voucherId,
      tenant_id: tenantId,
      voucher_number: `LCV-${this.voucherCounter}`,
      goods_receipt_ids: request.goods_receipt_ids,
      allocation_method: request.allocation_method,
      total_charges_minor: totalChargesMinor.toString(),
      currency_code: request.currency_code ?? 'USD',
      status: 'DRAFT',
      notes: request.notes ?? null,
      posted_by: null,
      posted_at: null,
      created_at: now,
      updated_at: now,
      charges: createdCharges,
      allocations: createdAllocations,
    };

    this.vouchersStore.set(`${tenantId}:${voucherId}`, voucher);
    return voucher;
  }

  async getById(tenantId: string, voucherId: string): Promise<LandedCostVoucher> {
    const voucher = this.vouchersStore.get(`${tenantId}:${voucherId}`);
    if (!voucher) {
      throw new NotFoundException(`Landed Cost Voucher '${voucherId}' not found for tenant '${tenantId}'.`);
    }
    return voucher;
  }

  async list(tenantId: string): Promise<LandedCostVoucher[]> {
    const vouchers: LandedCostVoucher[] = [];
    for (const [key, v] of this.vouchersStore.entries()) {
      if (key.startsWith(`${tenantId}:`)) {
        vouchers.push(v);
      }
    }
    return vouchers;
  }

  async post(tenantId: string, voucherId: string, postedBy: string): Promise<LandedCostVoucher> {
    const voucher = await this.getById(tenantId, voucherId);
    if (voucher.status === 'POSTED') {
      return voucher;
    }
    if (voucher.status === 'CANCELLED') {
      throw new BadRequestException('Cannot post a cancelled Landed Cost Voucher.');
    }

    const now = new Date().toISOString();
    voucher.status = 'POSTED';
    voucher.posted_by = postedBy;
    voucher.posted_at = now;
    voucher.updated_at = now;
    return voucher;
  }
}
