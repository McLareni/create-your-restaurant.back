import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionAuthMiddleware } from '../restaurants/middleware/session-auth.middleware';
import { UsersModule } from '../users/users.module';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { DishesController } from './dishes.controller';
import { DishesService } from './dishes.service';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';
import { MenuOwnerController } from './menu-owner.controller';
import { MenuOwnerService } from './menu-owner.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Module({
  imports: [UsersModule],
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
    CloudinaryService,
    MenuOwnerService,
    PrismaService,
    SessionAuthMiddleware,
  ],
})
export class MenuModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SessionAuthMiddleware).forRoutes(
      { path: 'menu', method: RequestMethod.POST },
      { path: 'menu/owner/:restaurantId', method: RequestMethod.GET },
      
      // Захист ендпоінтів MenuOwnerController (Lookups з ресторанною ізоляцією)
      { path: 'menu/owner/:restaurantId/dishes/lookups/tags', method: RequestMethod.GET },
      { path: 'menu/owner/:restaurantId/dishes/lookups/tags', method: RequestMethod.POST },
      { path: 'menu/owner/:restaurantId/dishes/lookups/tags/:name', method: RequestMethod.DELETE },
      { path: 'menu/owner/:restaurantId/dishes/lookups/allergens', method: RequestMethod.GET },
      { path: 'menu/owner/:restaurantId/dishes/lookups/allergens', method: RequestMethod.POST },
      { path: 'menu/owner/:restaurantId/dishes/lookups/allergens/:name', method: RequestMethod.DELETE },

      { path: 'menu/owner/categories', method: RequestMethod.POST },
      { path: 'menu/owner/categories/reorder', method: RequestMethod.PATCH },
      {
        path: 'menu/owner/categories/:categoryId',
        method: RequestMethod.PATCH,
      },
      {
        path: 'menu/owner/categories/:categoryId',
        method: RequestMethod.DELETE,
      },
      {
        path: 'menu/owner/categories/:categoryId/dishes',
        method: RequestMethod.POST,
      },
      { path: 'menu/owner/dishes/lookups/tags', method: RequestMethod.GET },
      {
        path: 'menu/owner/dishes/lookups/allergens',
        method: RequestMethod.GET,
      },
      {
        path: 'menu/owner/dishes/lookups/tags/:tagName',
        method: RequestMethod.DELETE,
      },
      {
        path: 'menu/owner/dishes/lookups/allergens/:allergenName',
        method: RequestMethod.DELETE,
      },
      { path: 'menu/owner/dishes/reorder', method: RequestMethod.PATCH },
      { path: 'menu/owner/dishes/:dishId', method: RequestMethod.PATCH },
      { path: 'menu/owner/dishes/:dishId', method: RequestMethod.DELETE },
    );
  }
}