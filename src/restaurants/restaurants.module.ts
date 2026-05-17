import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RestaurantsController } from './restaurants.controller';
import { RestaurantsService } from './restaurants.service';
import { UsersModule } from '../users/users.module';
import { SessionAuthMiddleware } from './middleware/session-auth.middleware';

@Module({
  imports: [UsersModule],
  controllers: [RestaurantsController],
  providers: [RestaurantsService, PrismaService, SessionAuthMiddleware],
})
export class RestaurantsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SessionAuthMiddleware).forRoutes(RestaurantsController);
  }
}
