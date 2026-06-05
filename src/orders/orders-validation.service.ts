import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { TableStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrdersValidationService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureRestaurantOwner(restaurantId: number, userId: number) {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: { id: restaurantId, ownerId: userId },
      select: { id: true },
    });
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }
  }

  async ensureActiveTableBelongsToRestaurant(
    restaurantId: number,
    tableId: string,
  ) {
    const table = await this.prisma.diningTable.findFirst({
      where: { id: tableId, restaurantId, status: TableStatus.ACTIVE },
      select: { id: true },
    });
    if (!table) {
      throw new BadRequestException('Table not found or inactive');
    }
  }

  async ensureOrderBelongsToRestaurant(restaurantId: number, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, restaurantId },
      select: { id: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
  }

  async getModifierOptionMap(
    modifierOptionIds: string[],
    restaurantId: number,
  ) {
    if (modifierOptionIds.length === 0) {
      return new Map<string, any>();
    }
    const modifierOptions = await this.prisma.modifierOption.findMany({
      where: {
        id: { in: modifierOptionIds },
        isAvailable: true,
        group: { restaurantId },
      },
      select: { id: true, name: true, price: true, modifierGroupId: true },
    });
    if (modifierOptions.length !== modifierOptionIds.length) {
      throw new BadRequestException(
        'Some modifier options are unavailable or not found',
      );
    }
    return new Map(modifierOptions.map((option) => [option.id, option]));
  }
}
