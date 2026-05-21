import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDishDto } from './dto/create-dish.dto';
import { DishBadge } from '@prisma/client';

@Injectable()
export class MenuOwnerService {
  constructor(private readonly prisma: PrismaService) {}

  async getFullMenu(restaurantId: number) {
    const categories = await this.prisma.category.findMany({
      where: { restaurantId },
      orderBy: { sortOrder: 'asc' },
      include: {
        dishes: {
          orderBy: { createdAt: 'asc' },
          include: {
            variants: true,
            ingredients: true,
            modifierRelation: {
              select: { modifierGroupId: true }
            },
          },
        },
      },
    });

    return {
      restaurantId,
      categories: categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        sortOrder: cat.sortOrder,
        restaurantId: cat.restaurantId,
        createdAt: cat.createdAt,
        updatedAt: cat.updatedAt,
        dishes: cat.dishes.map((dish) => {
          const { modifierRelation, ...rest } = dish;
          return {
            ...rest,
            modifierIds: modifierRelation.map((m) => m.modifierGroupId),
            upsellDishIds: [],
          };
        }),
      })),
    };
  }
}