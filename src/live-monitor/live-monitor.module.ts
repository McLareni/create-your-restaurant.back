import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionAuthMiddleware } from '../restaurants/middleware/session-auth.middleware';
import { UsersModule } from '../users/users.module';
import { LiveMonitorController } from './live-monitor.controller';
import { LiveMonitorGateway } from './live-monitor.gateway';
import { LiveMonitorService } from './live-monitor.service';

@Module({
  imports: [UsersModule],
  controllers: [LiveMonitorController],
  providers: [
    LiveMonitorService,
    LiveMonitorGateway,
    PrismaService,
    SessionAuthMiddleware,
  ],
  exports: [LiveMonitorGateway],
})
export class LiveMonitorModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SessionAuthMiddleware).forRoutes(LiveMonitorController);
  }
}
