import { Injectable, InternalServerErrorException } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly stripe: InstanceType<typeof Stripe>;
  private readonly webhookSecret: string;

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!secretKey || !webhookSecret) {
      throw new InternalServerErrorException('errors.stripe_not_configured');
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2026-04-22.dahlia' as const,
    });
    this.webhookSecret = webhookSecret;
  }

  async createPaymentIntent(
    amount: number,
    currency: string,
    orderId: string,
  ): Promise<{
    id: string;
    clientSecret: string | null;
    amount: number;
    status: string;
  }> {
    const intent = await this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      metadata: {
        orderId,
      },
    });

    return {
      id: intent.id,
      clientSecret: intent.client_secret,
      amount: intent.amount,
      status: intent.status,
    };
  }

  constructEventFromPayload(
    signature: string,
    payload: Buffer,
  ): {
    type: string;
    data: {
      object: Record<string, any>;
    };
  } {
    const event = this.stripe.webhooks.constructEvent(
      payload,
      signature,
      this.webhookSecret,
    );

    return {
      type: event.type,
      data: {
        object: event.data.object as Record<string, any>,
      },
    };
  }
}
