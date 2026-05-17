import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config'; // 1. Додаємо імпорт
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { UsersController } from './users/users.controller';
import { UsersService } from './users/users.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // 2. Реєструємо модуль глобально
    RestaurantsModule,
  ],
  controllers: [AppController, UsersController],
  providers: [AppService, PrismaService, UsersService],
})
export class AppModule {}
