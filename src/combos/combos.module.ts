import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionAuthMiddleware } from '../restaurants/middleware/session-auth.middleware';
import { UsersModule } from '../users/users.module';
import { CombosController } from './combos.controller';
import { CombosService } from './combos.service';

@Module({
  imports: [UsersModule],
  controllers: [CombosController],
  providers: [CombosService, PrismaService, SessionAuthMiddleware],
})
export class CombosModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Передаємо клас контролера — це автоматично застосує Middleware
    // до всіх його ендпоінтів та унеможливить помилки парсингу шляхів
    consumer.apply(SessionAuthMiddleware).forRoutes(CombosController);
  }
}
