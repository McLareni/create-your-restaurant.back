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

  private async checkAccess(restaurantId: number, userId: number) {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: { id: restaurantId, ownerId: userId },
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
    if (!item) throw new NotFoundException('Inventory item not found');

    const updatedItem = await this.prisma.inventoryItem.update({
      where: { id },
      data: dto,
    });

    const affectedIngredients = await this.prisma.dishIngredient.findMany({
      where: { inventoryItemId: id },
      select: { dishId: true, quantity: true },
    });

    for (const ing of affectedIngredients) {
      await this.prisma.dish.update({
        where: { id: ing.dishId },
        data: {
          isAvailable: updatedItem.stock >= ing.quantity,
        },
      });
    }

    return updatedItem;
  }

  async delete(restaurantId: number, id: string, userId: number) {
    await this.checkAccess(restaurantId, userId);

    const item = await this.prisma.inventoryItem.findFirst({
      where: { id, restaurantId },
    });
    if (!item) throw new NotFoundException('Inventory item not found');

    await this.prisma.inventoryItem.delete({ where: { id } });
    return { message: 'Inventory item deleted successfully' };
  }
}
