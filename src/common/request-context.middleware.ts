import { Injectable, BadRequestException } from '@nestjs/common';
import type { NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response, Request } from 'express';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const params = req.params;
    const id = params.restaurantId;

    if (id) {
      const parsed = Number(id);
      if (isNaN(parsed) || parsed <= 0) {
        throw new BadRequestException('errors.invalid_restaurant_identifier');
      }
      req.restaurantId = parsed;
    }
    next();
  }
}
