import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionAuthMiddleware } from '../restaurants/middleware/session-auth.middleware';
import { UsersModule } from '../users/users.module';
import { PosController } from './pos.controller';
import { PosService, PosAdapterFactory, PosterAdapter } from './pos.service';

@Module({
  imports: [UsersModule],
  controllers: [PosController],
  providers: [
    PosService,
    PrismaService,
    SessionAuthMiddleware,
    PosAdapterFactory,
    PosterAdapter,
  ],
})
export class PosModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SessionAuthMiddleware).forRoutes(PosController);
  }
}
