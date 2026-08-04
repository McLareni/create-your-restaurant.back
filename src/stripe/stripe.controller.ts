import {
  Controller,
  Post,
  Headers,
  Req,
  BadRequestException,
  InternalServerErrorException,
  HttpCode,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StripeService } from 'src/stripe/stripe.service';
import type { Request } from 'express';

@Controller('api/webhooks/stripe')
export class StripeController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Post()
  @HttpCode(200)
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: Request,
  ) {
    if (!signature) {
      throw new BadRequestException('errors.missing_stripe_signature');
    }

    let event;
    try {
      event = this.stripeService.constructEventFromPayload(
        signature,
        request.body as Buffer,
      );
    } catch {
      throw new BadRequestException('errors.invalid_stripe_signature');
    }

    try {
      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object as Record<string, any>;
        await this.eventEmitter.emitAsync('payment.succeeded', {
          orderId: paymentIntent.metadata?.orderId,
          amount: paymentIntent.amount,
        });
      }

      if (event.type === 'payment_intent.payment_failed') {
        const paymentIntent = event.data.object as Record<string, any>;
        await this.eventEmitter.emitAsync('payment.failed', {
          orderId: paymentIntent.metadata?.orderId,
        });
      }

      return { received: true };
    } catch {
      throw new InternalServerErrorException(
        'errors.webhook_processing_failed',
      );
    }
  }
}
