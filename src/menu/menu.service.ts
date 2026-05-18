import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMenuDto } from './dto/create-menu.dto';

@Injectable()
export class MenuService {
  constructor(private readonly prismaService: PrismaService) {}

  async getMenuForOwner(restaurantId: number, userId: number) {
    const restaurant = await this.prismaService.restaurant.findFirst({
      where: {
        id: restaurantId,
        ownerId: userId,
      },
      select: {
        id: true,
        categories: {
          orderBy: {
            sortOrder: 'asc',
          },
          select: {
            id: true,
            name: true,
            sortOrder: true,
            dishes: {
              select: {
                id: true,
                name: true,
                description: true,
                price: true,
                weight: true,
                cookingTime: true,
                calories: true,
                isVegan: true,
                isSpicy: true,
                isLactoseFree: true,
                badge: true,
                allergens: true,
                isAvailable: true,
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
      categories: restaurant.categories,
    };
  }

  async getMenu(restaurantId: number) {
    const restaurant = await this.prismaService.restaurant.findUnique({
      where: {
        id: restaurantId,
      },
      select: {
        id: true,
        categories: {
          where: {
            dishes: {
              some: {
                isAvailable: true,
              },
            },
          },
          orderBy: {
            sortOrder: 'asc',
          },
          select: {
            id: true,
            name: true,
            sortOrder: true,
            dishes: {
              where: {
                isAvailable: true,
              },
              select: {
                id: true,
                name: true,
                description: true,
                price: true,
                weight: true,
                cookingTime: true,
                calories: true,
                isVegan: true,
                isSpicy: true,
                isLactoseFree: true,
                badge: true,
                allergens: true,
                isAvailable: true,
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
      categories: restaurant.categories,
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
            sortOrder: category.sortOrder,
            dishes: {
              create: category.dishes.map((dish) => ({
                ...dish,
                allergens: dish.allergens ?? [],
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
