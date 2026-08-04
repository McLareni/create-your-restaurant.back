import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { LiveMonitorModule } from 'src/live-monitor/live-monitor.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { SessionAuthMiddleware } from 'src/restaurants/middleware/session-auth.middleware';
import { UsersModule } from 'src/users/users.module';
import { OrdersController } from 'src/orders/orders.controller';
import { OrdersService } from 'src/orders/orders.service';

@Module({
  imports: [UsersModule, LiveMonitorModule],
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
      { path: 'restaurants/:restaurantId/orders', method: RequestMethod.GET },
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
