import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SessionAuthMiddleware } from 'src/restaurants/middleware/session-auth.middleware';
import { UsersModule } from 'src/users/users.module';
import { PosController } from 'src/pos/pos.controller';
import { PosService } from 'src/pos/pos.service';
import { PosAdapterFactory, PosterAdapter } from 'src/pos/adapters/pos.adapter';

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
