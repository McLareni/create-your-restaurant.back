import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import type {
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
} from 'src/inventory/dto/inventory.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prismaService: PrismaService) {}

  async getAll(restaurantId: number) {
    return await this.prismaService.inventoryItem.findMany({
      where: { restaurantId },
      orderBy: { name: 'asc' },
    });
  }

  async create(restaurantId: number, dto: CreateInventoryItemDto) {
    try {
      return await this.prismaService.inventoryItem.create({
        data: {
          restaurantId,
          name: dto.name,
          stock: dto.stock,
          unit: dto.unit,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('errors.inventory_item_already_exists');
      }
      throw error;
    }
  }

  async update(restaurantId: number, id: string, dto: UpdateInventoryItemDto) {
    const item = await this.prismaService.inventoryItem.findFirst({
      where: { id, restaurantId },
    });
    if (!item) {
      throw new NotFoundException('errors.inventory_item_not_found');
    }
    return await this.prismaService.$transaction(async (tx) => {
      const updatedItem = await tx.inventoryItem.update({
        where: { id },
        data: dto,
      });
      const affectedIngredients = await tx.dishIngredient.findMany({
        where: { inventoryItemId: id },
        select: { dishId: true },
      });
      const uniqueDishIds = Array.from(
        new Set(affectedIngredients.map((ing) => ing.dishId)),
      );
      if (uniqueDishIds.length > 0) {
        const allIngredientsForDishes = await tx.dishIngredient.findMany({
          where: { dishId: { in: uniqueDishIds } },
        });
        const neededInventoryItemIds = Array.from(
          new Set(
            allIngredientsForDishes
              .map((ing) => ing.inventoryItemId)
              .filter((itemId): itemId is string => itemId !== null),
          ),
        );
        const inventoryItems = await tx.inventoryItem.findMany({
          where: { id: { in: neededInventoryItemIds } },
        });
        const inventoryMap = new Map(
          inventoryItems.map((inv) => [inv.id, inv]),
        );

        const unavailableDishIds: string[] = [];

        for (const dishId of uniqueDishIds) {
          const dishIngredients = allIngredientsForDishes.filter(
            (ing) => ing.dishId === dishId,
          );
          let canBeMade = true;
          for (const ing of dishIngredients) {
            if (ing.inventoryItemId) {
              const stockItem =
                ing.inventoryItemId === id
                  ? updatedItem
                  : inventoryMap.get(ing.inventoryItemId);
              if (!stockItem || stockItem.stock < ing.quantity) {
                canBeMade = false;
                break;
              }
            }
          }
          if (!canBeMade) {
            unavailableDishIds.push(dishId);
          }
        }

        if (unavailableDishIds.length > 0) {
          await tx.dish.updateMany({
            where: { id: { in: unavailableDishIds } },
            data: { isAvailable: false },
          });
        }

        const availableDishIds = uniqueDishIds.filter(
          (id) => !unavailableDishIds.includes(id),
        );

        if (availableDishIds.length > 0) {
          await tx.dish.updateMany({
            where: { id: { in: availableDishIds } },
            data: { isAvailable: true },
          });
        }
      }
      return updatedItem;
    });
  }

  async delete(restaurantId: number, id: string) {
    const item = await this.prismaService.inventoryItem.findFirst({
      where: { id, restaurantId },
    });
    if (!item) {
      throw new NotFoundException('errors.inventory_item_not_found');
    }
    await this.prismaService.inventoryItem.delete({ where: { id } });
    return { message: 'success.inventory_item_deleted' };
  }
}
