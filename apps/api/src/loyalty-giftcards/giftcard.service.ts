import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  GiftCardAccount,
  GiftCardTransaction,
  IssueGiftCardRequest,
  RedeemGiftCardRequest,
  ReloadGiftCardRequest,
  InquireGiftCardRequest,
} from '@stokrova/contracts';
import {
  IssueGiftCardSchema,
  RedeemGiftCardSchema,
  ReloadGiftCardSchema,
  InquireGiftCardSchema,
} from '@stokrova/validation';
import {
  generateGiftCardCode,
  hashGiftCardPin,
  verifyGiftCardPin,
  applyGiftCardRedemption,
  applyGiftCardReload,
  LoyaltyDomainError,
} from '@stokrova/domain';

@Injectable()
export class GiftCardService {
  private readonly cards = new Map<string, GiftCardAccount>(); // tenant:code -> card
  private readonly transactions = new Map<string, GiftCardTransaction>();
  private readonly processedOperations = new Set<string>(); // tenant:operationId

  // ==========================================================================
  // Gift Card Issuance
  // ==========================================================================

  async issueGiftCard(
    tenantId: string,
    req: IssueGiftCardRequest,
  ): Promise<GiftCardAccount> {
    if (!tenantId) {
      throw new BadRequestException('tenant_id is required');
    }
    const parsed = IssueGiftCardSchema.parse(req);
    const opKey = `${tenantId}:${parsed.operation_id}`;

    // Rule 19: Durable idempotency
    if (this.processedOperations.has(opKey)) {
      // Find existing card issued under this operation
      const existingTx = Array.from(this.transactions.values()).find(
        (t) => t.tenant_id === tenantId && t.operation_id === parsed.operation_id,
      );
      if (existingTx) {
        const existingCard = Array.from(this.cards.values()).find(
          (c) => c.id === existingTx.gift_card_id,
        );
        if (existingCard) return existingCard;
      }
    }

    const cardCode = generateGiftCardCode('GFT', `${tenantId}-${parsed.operation_id}-${Date.now()}`);
    const key = `${tenantId}:${cardCode}`;
    const now = new Date().toISOString();
    const id = `gft_${randomUUID()}`;

    let pinHash: string | null = null;
    let pinSalt: string | null = null;
    if (parsed.pin) {
      pinSalt = randomUUID().replace(/-/g, '').substring(0, 16);
      pinHash = hashGiftCardPin(parsed.pin, pinSalt);
    }

    const card: GiftCardAccount = {
      id,
      tenant_id: tenantId,
      card_code: cardCode,
      pin_hash: pinHash,
      pin_salt: pinSalt,
      currency: parsed.currency,
      initial_balance_minor: parsed.initial_balance_minor,
      current_balance_minor: parsed.initial_balance_minor,
      status: 'ACTIVE',
      customer_id: parsed.customer_id ?? null,
      expires_at: parsed.expires_at ?? null,
      created_at: now,
      updated_at: now,
    };

    this.cards.set(key, card);

    const tx: GiftCardTransaction = {
      id: `gtx_${randomUUID()}`,
      tenant_id: tenantId,
      gift_card_id: id,
      transaction_type: 'ISSUE',
      amount_minor: parsed.initial_balance_minor,
      previous_balance_minor: '0',
      new_balance_minor: parsed.initial_balance_minor,
      operation_id: parsed.operation_id,
      created_at: now,
    };
    this.transactions.set(tx.id, tx);
    this.processedOperations.add(opKey);

    return card;
  }

  // ==========================================================================
  // Inquire & Verification
  // ==========================================================================

  async getCard(tenantId: string, cardCode: string): Promise<GiftCardAccount> {
    const key = `${tenantId}:${cardCode.trim().toUpperCase()}`;
    const card = this.cards.get(key);
    if (!card || card.tenant_id !== tenantId) {
      throw new NotFoundException(`Gift card '${cardCode}' not found`);
    }
    return card;
  }

  async inquireBalance(
    tenantId: string,
    req: InquireGiftCardRequest,
  ): Promise<{ card_code: string; balance_minor: string; status: string; currency: string }> {
    const parsed = InquireGiftCardSchema.parse(req);
    const card = await this.getCard(tenantId, parsed.card_code);

    if (card.pin_hash && card.pin_salt) {
      if (!parsed.pin || !verifyGiftCardPin(parsed.pin, card.pin_hash, card.pin_salt)) {
        throw new UnauthorizedException('Invalid gift card PIN');
      }
    }

    return {
      card_code: card.card_code,
      balance_minor: card.current_balance_minor,
      status: card.status,
      currency: card.currency,
    };
  }

  // ==========================================================================
  // Redemption & Reload
  // ==========================================================================

  async redeemGiftCard(
    tenantId: string,
    req: RedeemGiftCardRequest,
  ): Promise<{ card: GiftCardAccount; amountDeductedMinor: string }> {
    const parsed = RedeemGiftCardSchema.parse(req);
    const opKey = `${tenantId}:${parsed.operation_id}`;

    const card = await this.getCard(tenantId, parsed.card_code);

    if (this.processedOperations.has(opKey)) {
      return { card, amountDeductedMinor: '0' };
    }

    if (card.status !== 'ACTIVE') {
      throw new LoyaltyDomainError(
        'GIFT_CARD_NOT_ACTIVE',
        `Gift card is '${card.status}' and cannot be redeemed`,
        { status: card.status },
      );
    }

    if (card.pin_hash && card.pin_salt) {
      if (!parsed.pin || !verifyGiftCardPin(parsed.pin, card.pin_hash, card.pin_salt)) {
        throw new UnauthorizedException('Invalid gift card PIN');
      }
    }

    const previousBalance = card.current_balance_minor;
    const res = applyGiftCardRedemption(card.current_balance_minor, parsed.amount_minor);

    const now = new Date().toISOString();
    card.current_balance_minor = res.new_balance_minor;
    card.status = res.status;
    card.updated_at = now;

    const tx: GiftCardTransaction = {
      id: `gtx_${randomUUID()}`,
      tenant_id: tenantId,
      gift_card_id: card.id,
      transaction_type: 'REDEEM',
      amount_minor: res.actual_deducted_minor,
      previous_balance_minor: previousBalance,
      new_balance_minor: res.new_balance_minor,
      reference_order_id: parsed.order_id ?? null,
      operation_id: parsed.operation_id,
      created_at: now,
    };
    this.transactions.set(tx.id, tx);
    this.processedOperations.add(opKey);

    return { card, amountDeductedMinor: res.actual_deducted_minor };
  }

  async reloadGiftCard(
    tenantId: string,
    req: ReloadGiftCardRequest,
  ): Promise<GiftCardAccount> {
    const parsed = ReloadGiftCardSchema.parse(req);
    const opKey = `${tenantId}:${parsed.operation_id}`;

    const card = await this.getCard(tenantId, parsed.card_code);

    if (this.processedOperations.has(opKey)) {
      return card;
    }

    if (card.status === 'EXPIRED' || card.status === 'FROZEN') {
      throw new LoyaltyDomainError(
        'GIFT_CARD_UNRELOADABLE',
        `Gift card in status '${card.status}' cannot be reloaded`,
        { status: card.status },
      );
    }

    const previousBalance = card.current_balance_minor;
    const res = applyGiftCardReload(card.current_balance_minor, parsed.amount_minor);

    const now = new Date().toISOString();
    card.current_balance_minor = res.new_balance_minor;
    card.status = res.status;
    card.updated_at = now;

    const tx: GiftCardTransaction = {
      id: `gtx_${randomUUID()}`,
      tenant_id: tenantId,
      gift_card_id: card.id,
      transaction_type: 'RELOAD',
      amount_minor: parsed.amount_minor,
      previous_balance_minor: previousBalance,
      new_balance_minor: res.new_balance_minor,
      operation_id: parsed.operation_id,
      created_at: now,
    };
    this.transactions.set(tx.id, tx);
    this.processedOperations.add(opKey);

    return card;
  }
}
