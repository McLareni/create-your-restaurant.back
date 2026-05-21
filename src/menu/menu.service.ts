import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMenuDto } from './dto/create-menu.dto';

@Injectable()
export class MenuService {
  constructor(private readonly prismaService: PrismaService) {}

  private mapDishImages(
    dish: {
      images: Array<{
        image: {
          id: string;
          url: string;
        };
      }>;
    } & Record<string, unknown>,
  ) {
    return {
      ...dish,
      images: dish.images.map(({ image }) => image),
    };
  }

  async getMenuForOwner(restaurantId: number, userId: number) {
    const restaurant = await this.prismaService.restaurant.findFirst({
      where: {
        id: restaurantId,
        ownerId: userId,
      },
      include: {
        categories: {
          orderBy: { sortOrder: 'asc' },
          include: {
            dishes: {
              orderBy: { sortOrder: 'asc' },
              include: {
                variants: true,
                ingredients: true,
                modifiers: true,
              },
            },
          },
        },
      },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    return {
      restaurantId: restaurant.id,
      categories: restaurant.categories.map((category) => ({
        ...category,
        dishes: category.dishes.map((dish) => this.mapDishImages(dish)),
      })),
    };
  }

  async getMenu(restaurantId: number) {
    const restaurant = await this.prismaService.restaurant.findUnique({
      where: { id: restaurantId },
      include: {
        categories: {
          where: {
            dishes: {
              some: { isAvailable: true },
            },
          },
          orderBy: { sortOrder: 'asc' },
          include: {
            dishes: {
              where: { isAvailable: true },
              orderBy: { sortOrder: 'asc' },
              include: {
                variants: true,
                ingredients: true,
              },
            },
          },
        },
      },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    return {
      restaurantId: restaurant.id,
      categories: restaurant.categories.map((category) => ({
        ...category,
        dishes: category.dishes.map((dish) => this.mapDishImages(dish)),
      })),
    };
  }

  async create(createMenuDto: CreateMenuDto, userId: number) {
    const prisma = this.prismaService;

    const restaurant = await prisma.restaurant.findFirst({
      where: {
        id: createMenuDto.restaurantId,
        ownerId: userId,
      },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    let dishesCreated = 0;

    await prisma.$transaction(async (transactionClient) => {
      for (const category of createMenuDto.categories) {
        dishesCreated += category.dishes.length;

        await transactionClient.category.create({
          data: {
            restaurantId: createMenuDto.restaurantId,
            name: category.name,
            sortOrder: category.sortOrder ?? 0,
            dishes: {
              create: category.dishes.map((dish) => ({
                name: dish.name,
                description: dish.description ?? '',
                price: dish.price,
                weight: dish.weight ?? null,
                cookingTime: dish.cookingTime ?? null,
                calories: dish.calories ?? null,
                isVegan: dish.isVegan ?? false,
                isSpicy: dish.isSpicy ?? false,
                isLactoseFree: dish.isLactoseFree ?? false,
                badge: 'NONE',
                isAvailable: dish.isAvailable ?? true,
                allergens: dish.allergens ?? [],
                tags: [],
                taxRate: 0,
              })),
            },
          },
        });
      }
    });

    return {
      message: 'Menu created successfully',
      restaurantId: createMenuDto.restaurantId,
      categoriesCreated: createMenuDto.categories.length,
      dishesCreated,
    };
  }
}