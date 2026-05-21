import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionAuthMiddleware } from '../restaurants/middleware/session-auth.middleware';
import { UsersModule } from '../users/users.module';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';

@Module({
  imports: [UsersModule],
  controllers: [StaffController],
  providers: [StaffService, PrismaService, SessionAuthMiddleware],
})
export class StaffModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SessionAuthMiddleware).forRoutes(
      { path: 'restaurants/:restaurantId/staff', method: RequestMethod.POST },
      { path: 'restaurants/:restaurantId/staff', method: RequestMethod.GET },
      {
        path: 'restaurants/:restaurantId/staff/:staffId',
        method: RequestMethod.PATCH,
      },
      {
        path: 'restaurants/:restaurantId/staff/:staffId',
        method: RequestMethod.DELETE,
      },
    );
  }
}
