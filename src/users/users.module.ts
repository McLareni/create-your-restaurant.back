import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SessionAuthMiddleware } from 'src/restaurants/middleware/session-auth.middleware';
import { UsersController } from 'src/users/users.controller';
import { UsersService } from 'src/users/users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, PrismaService, SessionAuthMiddleware],
  exports: [UsersService],
})
export class UsersModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SessionAuthMiddleware).forRoutes({
      path: 'users/me',
      method: RequestMethod.GET,
    });
  }
}
