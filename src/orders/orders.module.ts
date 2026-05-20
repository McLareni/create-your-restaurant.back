import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionAuthMiddleware } from '../restaurants/middleware/session-auth.middleware';
import { UsersModule } from '../users/users.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [UsersModule],
  controllers: [OrdersController],
  providers: [OrdersService, PrismaService, SessionAuthMiddleware],
})
export class OrdersModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SessionAuthMiddleware).forRoutes(
      {
        path: 'restaurants/:restaurantId/orders',
        method: RequestMethod.POST,
      },
      {
        path: 'restaurants/:restaurantId/orders',
        method: RequestMethod.GET,
      },
      {
        path: 'restaurants/:restaurantId/orders/:orderId',
        method: RequestMethod.GET,
      },
      {
        path: 'restaurants/:restaurantId/orders/:orderId',
        method: RequestMethod.PATCH,
      },
      {
        path: 'restaurants/:restaurantId/orders/:orderId',
        method: RequestMethod.DELETE,
      },
    );
  }
}
