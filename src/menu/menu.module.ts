import { Module, RequestMethod } from '@nestjs/common';
import type { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SessionAuthMiddleware } from 'src/restaurants/middleware/session-auth.middleware';
import { UsersModule } from 'src/users/users.module';
import { CategoriesController } from 'src/menu/categories.controller';
import { CategoriesService } from 'src/menu/categories.service';
import { DishesController } from 'src/menu/dishes.controller';
import { DishesService } from 'src/menu/dishes.service';
import { MenuController } from 'src/menu/menu.controller';
import { MenuService } from 'src/menu/menu.service';
import { MenuOwnerController } from 'src/menu/menu-owner.controller';
import { MenuOwnerService } from 'src/menu/menu-owner.service';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

@Module({
  imports: [UsersModule, CloudinaryModule],
  controllers: [
    MenuController,
    CategoriesController,
    DishesController,
    MenuOwnerController,
  ],
  providers: [
    MenuService,
    CategoriesService,
    DishesService,
    MenuOwnerService,
    PrismaService,
    SessionAuthMiddleware,
  ],
})
export class MenuModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SessionAuthMiddleware).forRoutes(
      {
        path: 'restaurants/:restaurantId/menu',
        method: RequestMethod.POST,
      },
      {
        path: 'menu/owner',
        method: RequestMethod.ALL,
      },
      {
        path: 'menu/owner/*',
        method: RequestMethod.ALL,
      },
    );
  }
}
