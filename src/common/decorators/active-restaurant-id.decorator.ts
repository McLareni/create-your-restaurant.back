import { createParamDecorator, BadRequestException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export const ActiveRestaurantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): number => {
    const request = ctx.switchToHttp().getRequest<Request>();

    if (request.restaurantId) {
      return request.restaurantId;
    }

    const headerId = request.headers['x-restaurant-id'];

    if (!headerId) {
      throw new BadRequestException('errors.missing_restaurant_header');
    }

    const parsed = Number(headerId);

    if (isNaN(parsed) || parsed <= 0) {
      throw new BadRequestException('errors.invalid_restaurant_identifier');
    }

    return parsed;
  },
);
