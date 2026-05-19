import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionAuthMiddleware } from '../restaurants/middleware/session-auth.middleware';
import { UsersModule } from '../users/users.module';
import { TablesController } from './tables.controller';
import { TablesService } from './tables.service';

@Module({
  imports: [UsersModule],
  controllers: [TablesController],
  providers: [TablesService, PrismaService, SessionAuthMiddleware],
})
export class TablesModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SessionAuthMiddleware).forRoutes(
      {
        path: 'restaurants/:restaurantId/tables',
        method: RequestMethod.POST,
      },
      { path: 'restaurants/:restaurantId/tables', method: RequestMethod.GET },
      {
        path: 'restaurants/:restaurantId/tables/:tableId',
        method: RequestMethod.PATCH,
      },
      {
        path: 'restaurants/:restaurantId/tables/:tableId',
        method: RequestMethod.DELETE,
      },
    );
  }
}
