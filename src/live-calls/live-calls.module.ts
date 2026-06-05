import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionAuthMiddleware } from '../restaurants/middleware/session-auth.middleware';
import { UsersModule } from '../users/users.module';
import { LiveCallsController } from './live-calls.controller';
import { LiveCallsService } from './live-calls.service';
import { LiveCallsGateway } from './live-calls.gateway';

@Module({
  imports: [UsersModule],
  controllers: [LiveCallsController],
  providers: [
    LiveCallsService,
    LiveCallsGateway,
    PrismaService,
    SessionAuthMiddleware,
  ],
})
export class LiveCallsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SessionAuthMiddleware).forRoutes(
      {
        path: 'restaurants/:restaurantId/live-calls',
        method: RequestMethod.GET,
      },
      {
        path: 'restaurants/:restaurantId/live-calls/:callId',
        method: RequestMethod.DELETE,
      },
    );
  }
}
