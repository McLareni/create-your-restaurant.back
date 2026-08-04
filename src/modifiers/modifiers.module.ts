import { MiddlewareConsumer, Module } from '@nestjs/common';
import type { NestModule } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SessionAuthMiddleware } from 'src/restaurants/middleware/session-auth.middleware';
import { UsersModule } from 'src/users/users.module';
import { ModifiersController } from 'src/modifiers/modifiers.controller';
import { ModifiersService } from 'src/modifiers/modifiers.service';

@Module({
  imports: [UsersModule],
  controllers: [ModifiersController],
  providers: [ModifiersService, PrismaService, SessionAuthMiddleware],
})
export class ModifiersModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SessionAuthMiddleware).forRoutes(ModifiersController);
  }
}
