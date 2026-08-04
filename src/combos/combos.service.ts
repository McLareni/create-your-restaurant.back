import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import type { CreateComboDto } from 'src/combos/dto/create-combo.dto';
import type { UpdateComboDto } from 'src/combos/dto/update-combo.dto';

@Injectable()
export class CombosService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(restaurantId: number) {
    return await this.prisma.combo.findMany({
      where: { restaurantId },
      include: {
        dishes: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(restaurantId: number, dto: CreateComboDto) {
    return await this.prisma.$transaction(async (tx) => {
      const dishIds = dto.dishes.map((d) => d.id);
      const dbDishes = await tx.dish.findMany({
        where: {
          id: { in: dishIds },
          category: { restaurantId },
        },
        select: { id: true },
      });

      if (dbDishes.length !== new Set(dishIds).size) {
        throw new BadRequestException('errors.invalid_dishes');
      }

      return await tx.combo.create({
        data: {
          restaurantId,
          name: dto.name,
          priceType: dto.priceType,
          priceValue: dto.priceValue,
          dishes: {
            create: dto.dishes.map((d) => ({
              dishId: d.id,
            })),
          },
        },
        include: {
          dishes: true,
        },
      });
    });
  }

  async update(restaurantId: number, id: string, dto: UpdateComboDto) {
    return await this.prisma.$transaction(async (tx) => {
      const combo = await tx.combo.findFirst({
        where: { id, restaurantId },
        include: { dishes: true },
      });

      if (!combo) {
        throw new NotFoundException('errors.combo_not_found');
      }

      let dishesUpdateStrategy;

      if (dto.dishes) {
        const dishIds = dto.dishes.map((d) => d.id);
        const dbDishes = await tx.dish.findMany({
          where: {
            id: { in: dishIds },
            category: { restaurantId },
          },
          select: { id: true },
        });

        if (dbDishes.length !== new Set(dishIds).size) {
          throw new BadRequestException('errors.invalid_dishes');
        }

        const existingDishIds = combo.dishes.map((d) => d.dishId);
        const incomingDishIds = dto.dishes.map((d) => d.id);

        const toDelete = existingDishIds.filter(
          (existingId) => !incomingDishIds.includes(existingId),
        );
        const toAdd = incomingDishIds.filter(
          (incomingId) => !existingDishIds.includes(incomingId),
        );

        dishesUpdateStrategy = {
          deleteMany:
            toDelete.length > 0 ? { dishId: { in: toDelete } } : undefined,
          create: toAdd.map((dishId) => ({ dishId })),
        };
      }

      return await tx.combo.update({
        where: { id },
        data: {
          name: dto.name,
          priceType: dto.priceType,
          priceValue: dto.priceValue,
          ...(dishesUpdateStrategy && { dishes: dishesUpdateStrategy }),
        },
        include: {
          dishes: true,
        },
      });
    });
  }

  async delete(restaurantId: number, id: string) {
    return await this.prisma.$transaction(async (tx) => {
      const combo = await tx.combo.findFirst({
        where: { id, restaurantId },
        select: { id: true },
      });

      if (!combo) {
        throw new NotFoundException('errors.combo_not_found');
      }

      await tx.combo.delete({ where: { id } });
      return { message: 'responses.combo_deleted' };
    });
  }
}
