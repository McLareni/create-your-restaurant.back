import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { DataMappingUtil } from 'src/common/utils/mapping.util';
import type { Prisma } from '@prisma/client';

type MenuRestaurant = Prisma.RestaurantGetPayload<{
  include: typeof menuIncludeArgs;
}>;

const menuIncludeArgs = {
  categories: {
    orderBy: { sortOrder: 'asc' as const },
    include: {
      dishes: {
        orderBy: { sortOrder: 'asc' as const },
        include: {
          images: {
            include: {
              image: true,
            },
          },
          ingredients: true,
          allergens: true,
          tags: true,
          modifiers: {
            include: {
              modifierGroup: {
                include: { options: true },
              },
            },
          },
        },
      },
    },
  },
};

@Injectable()
export class MenuService {
  constructor(private readonly prismaService: PrismaService) {}

  async getMenu(restaurantId: number) {
    const restaurant = await this.prismaService.restaurant.findUnique({
      where: { id: restaurantId },
      include: menuIncludeArgs,
    });

    if (!restaurant) {
      throw new NotFoundException('errors.restaurant_not_found');
    }

    return this.mapPublicMenuResponse(restaurant);
  }

  async getMenuBySlug(slug: string) {
    const restaurant = await this.prismaService.restaurant.findUnique({
      where: { slug },
      include: menuIncludeArgs,
    });

    if (!restaurant) {
      throw new NotFoundException('errors.restaurant_not_found');
    }

    return this.mapPublicMenuResponse(restaurant);
  }

  private mapPublicMenuResponse(restaurant: MenuRestaurant) {
    return {
      restaurantId: restaurant.id,
      restaurantName: restaurant.title,
      visualSettings: restaurant.visualSettings,
      categories: restaurant.categories.map((category) => ({
        ...category,
        dishes: category.dishes.map((dish) => {
          const mapped = DataMappingUtil.mapDishImages(dish);
          return {
            ...mapped,
            allergens: dish.allergens.map((item) => item.name),
            tags: dish.tags.map((item) => item.name),
          };
        }),
      })),
    };
  }
}
