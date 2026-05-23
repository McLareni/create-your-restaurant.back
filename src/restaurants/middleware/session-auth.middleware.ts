import {
  BadRequestException,
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { UsersService } from '../../users/users.service';

export type AuthenticatedRequest = Request & {
  user: User;
};

@Injectable()
export class SessionAuthMiddleware implements NestMiddleware {
  constructor(private readonly usersService: UsersService) {}

  async use(request: Request, _response: Response, next: NextFunction) {
    const token = (request.cookies as Record<string, string> | undefined)
      ?.gustio_session;

    if (!token) {
      throw new BadRequestException('Session token is required');
    }

    try {
      const user = await this.usersService.validateSessionToken(token);
      (request as AuthenticatedRequest).user = user;
      next();
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired session token');
    }
  }
}
