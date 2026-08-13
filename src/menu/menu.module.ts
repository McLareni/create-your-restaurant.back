import { Module } from '@nestjs/common';
import type {} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
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
    CategoriesController,
    DishesController,
    MenuOwnerController,
    MenuController,
  ],
  providers: [
    MenuService,
    CategoriesService,
    DishesService,
    MenuOwnerService,
    PrismaService,
  ],
})
export class MenuModule {}
