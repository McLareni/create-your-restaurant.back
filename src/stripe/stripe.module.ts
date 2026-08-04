import { Module } from '@nestjs/common';
import { StripeService } from 'src/stripe/stripe.service';
import { StripeController } from 'src/stripe/stripe.controller';

@Module({
  controllers: [StripeController],
  providers: [StripeService],
  exports: [StripeService],
})
export class StripeModule {}
