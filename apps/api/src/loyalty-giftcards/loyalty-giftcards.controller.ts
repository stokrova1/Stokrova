import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { LoyaltyService } from './loyalty.service.js';
import { GiftCardService } from './giftcard.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator.js';
import type {
  LoyaltyProgram,
  LoyaltyAccount,
  GiftCardAccount,
  CreateLoyaltyProgramRequest,
  EarnLoyaltyPointsRequest,
  RedeemLoyaltyPointsRequest,
  IssueGiftCardRequest,
  RedeemGiftCardRequest,
  ReloadGiftCardRequest,
  InquireGiftCardRequest,
  PointsRedemptionCalculationResult,
} from '@stokrova/contracts';

@Controller()
export class LoyaltyGiftCardsController {
  constructor(
    private readonly loyaltyService: LoyaltyService,
    private readonly giftCardService: GiftCardService,
  ) {}

  // ==========================================================================
  // Loyalty Program Endpoints
  // ==========================================================================

  @Post('loyalty/programs')
  @UseGuards(AuthGuard, TenantGuard)
  async createProgram(
    @CurrentTenant() tenant: { id: string },
    @Body() body: CreateLoyaltyProgramRequest,
  ): Promise<LoyaltyProgram> {
    return this.loyaltyService.createProgram(tenant.id, body);
  }

  @Get('loyalty/programs')
  @UseGuards(AuthGuard, TenantGuard)
  async getProgram(
    @CurrentTenant() tenant: { id: string },
    @Query('programId') programId?: string,
  ): Promise<LoyaltyProgram> {
    return this.loyaltyService.getProgram(tenant.id, programId);
  }

  @Get('loyalty/accounts/:customerId')
  @UseGuards(AuthGuard, TenantGuard)
  async getAccount(
    @CurrentTenant() tenant: { id: string },
    @Param('customerId') customerId: string,
    @Query('programId') programId?: string,
  ): Promise<LoyaltyAccount> {
    return this.loyaltyService.getOrCreateAccount(tenant.id, customerId, programId);
  }

  @Post('loyalty/points/earn')
  @UseGuards(AuthGuard, TenantGuard)
  async earnPoints(
    @CurrentTenant() tenant: { id: string },
    @Body() body: EarnLoyaltyPointsRequest,
  ): Promise<{ account: LoyaltyAccount; pointsEarned: number }> {
    return this.loyaltyService.earnPoints(tenant.id, body);
  }

  @Post('loyalty/points/calculate-redemption')
  @UseGuards(AuthGuard, TenantGuard)
  async calculateRedemption(
    @CurrentTenant() tenant: { id: string },
    @Body() body: { customerId: string; pointsToRedeem: number; orderTotalMinor: string },
  ): Promise<PointsRedemptionCalculationResult> {
    return this.loyaltyService.calculateRedemptionDiscount(
      tenant.id,
      body.customerId,
      body.pointsToRedeem,
      body.orderTotalMinor,
    );
  }

  @Post('loyalty/points/redeem')
  @UseGuards(AuthGuard, TenantGuard)
  async redeemPoints(
    @CurrentTenant() tenant: { id: string },
    @Body() body: RedeemLoyaltyPointsRequest,
  ): Promise<{ account: LoyaltyAccount; discountMinor: string; pointsUsed: number }> {
    return this.loyaltyService.redeemPoints(tenant.id, body);
  }

  // ==========================================================================
  // Gift Card Endpoints
  // ==========================================================================

  @Post('gift-cards')
  @UseGuards(AuthGuard, TenantGuard)
  async issueGiftCard(
    @CurrentTenant() tenant: { id: string },
    @Body() body: IssueGiftCardRequest,
  ): Promise<GiftCardAccount> {
    return this.giftCardService.issueGiftCard(tenant.id, body);
  }

  @Get('gift-cards/:cardCode')
  @UseGuards(AuthGuard, TenantGuard)
  async getCard(
    @CurrentTenant() tenant: { id: string },
    @Param('cardCode') cardCode: string,
  ): Promise<GiftCardAccount> {
    return this.giftCardService.getCard(tenant.id, cardCode);
  }

  @Post('gift-cards/inquire')
  @UseGuards(AuthGuard, TenantGuard)
  async inquireBalance(
    @CurrentTenant() tenant: { id: string },
    @Body() body: InquireGiftCardRequest,
  ): Promise<{ card_code: string; balance_minor: string; status: string; currency: string }> {
    return this.giftCardService.inquireBalance(tenant.id, body);
  }

  @Post('gift-cards/redeem')
  @UseGuards(AuthGuard, TenantGuard)
  async redeemGiftCard(
    @CurrentTenant() tenant: { id: string },
    @Body() body: RedeemGiftCardRequest,
  ): Promise<{ card: GiftCardAccount; amountDeductedMinor: string }> {
    return this.giftCardService.redeemGiftCard(tenant.id, body);
  }

  @Post('gift-cards/reload')
  @UseGuards(AuthGuard, TenantGuard)
  async reloadGiftCard(
    @CurrentTenant() tenant: { id: string },
    @Body() body: ReloadGiftCardRequest,
  ): Promise<GiftCardAccount> {
    return this.giftCardService.reloadGiftCard(tenant.id, body);
  }
}
