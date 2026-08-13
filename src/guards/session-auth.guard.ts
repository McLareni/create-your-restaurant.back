import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.cookies?.gustio_session;

    if (!token) {
      throw new UnauthorizedException('errors.session_required');
    }

    try {
      const user = await this.usersService.validateSessionToken(token);
      request.user = user;
      request.sessionToken = token;
      return true;
    } catch {
      throw new UnauthorizedException('errors.session_invalid');
    }
  }
}
