import { MiddlewareConsumer, Module } from '@nestjs/common';
import type { NestModule } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SessionAuthMiddleware } from 'src/restaurants/middleware/session-auth.middleware';
import { UsersModule } from 'src/users/users.module';
import { CombosController } from 'src/combos/combos.controller';
import { CombosService } from 'src/combos/combos.service';

@Module({
  imports: [UsersModule],
  controllers: [CombosController],
  providers: [CombosService, PrismaService, SessionAuthMiddleware],
})
export class CombosModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SessionAuthMiddleware).forRoutes(CombosController);
  }
}
