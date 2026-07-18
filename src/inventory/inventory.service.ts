import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
} from './dto/inventory.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  private async checkAccess(
    restaurantId: number,
    userId: number,
  ): Promise<void> {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: {
        id: restaurantId,
        ownerId: userId,
      },
    });
    if (!restaurant) {
      throw new ForbiddenException('Access to this restaurant is denied');
    }
  }

  async getAll(restaurantId: number, userId: number) {
    await this.checkAccess(restaurantId, userId);
    return this.prisma.inventoryItem.findMany({
      where: { restaurantId },
      orderBy: { name: 'asc' },
    });
  }

  async create(
    restaurantId: number,
    dto: CreateInventoryItemDto,
    userId: number,
  ) {
    await this.checkAccess(restaurantId, userId);
    try {
      return await this.prisma.inventoryItem.create({
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
        throw new ConflictException(
          'Product with this name already exists in inventory',
        );
      }
      throw error;
    }
  }

  async update(
    restaurantId: number,
    id: string,
    dto: UpdateInventoryItemDto,
    userId: number,
  ) {
    await this.checkAccess(restaurantId, userId);
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id, restaurantId },
    });
    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }

    return await this.prisma.$transaction(async (tx) => {
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

      for (const dishId of uniqueDishIds) {
        const allIngredientsForDish = await tx.dishIngredient.findMany({
          where: { dishId },
        });

        let canBeMade = true;
        for (const ing of allIngredientsForDish) {
          if (ing.inventoryItemId) {
            const stockItem =
              ing.inventoryItemId === id
                ? updatedItem
                : await tx.inventoryItem.findUnique({
                    where: { id: ing.inventoryItemId },
                  });

            if (!stockItem || stockItem.stock < ing.quantity) {
              canBeMade = false;
              break;
            }
          }
        }

        await tx.dish.update({
          where: { id: dishId },
          data: { isAvailable: canBeMade },
        });
      }

      return updatedItem;
    });
  }

  async delete(restaurantId: number, id: string, userId: number) {
    await this.checkAccess(restaurantId, userId);
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id, restaurantId },
    });
    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }

    await this.prisma.inventoryItem.delete({ where: { id } });
    return { message: 'Inventory item deleted successfully' };
  }
}
