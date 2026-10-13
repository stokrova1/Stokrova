import { Module } from '@nestjs/common';
import { LoyaltyService } from './loyalty.service.js';
import { GiftCardService } from './giftcard.service.js';
import { LoyaltyGiftCardsController } from './loyalty-giftcards.controller.js';

@Module({
  controllers: [LoyaltyGiftCardsController],
  providers: [LoyaltyService, GiftCardService],
  exports: [LoyaltyService, GiftCardService],
})
export class LoyaltyGiftCardsModule {}
