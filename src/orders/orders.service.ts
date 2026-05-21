import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, OrderType, TableStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

type ModifierOptionLookup = {
  id: string;
  name: string;
  price: number;
  modifierGroupId: string;
};

@Injectable()
export class OrdersService {
  constructor(private readonly prismaService: PrismaService) {}

  async createOrder(
    restaurantId: number,
    createOrderDto: CreateOrderDto,
    userId: number,
  ) {
    await this.ensureRestaurantOwner(restaurantId, userId);

    const orderType = createOrderDto.type ?? OrderType.DINE_IN;

    if (orderType === OrderType.DINE_IN && !createOrderDto.tableId) {
      throw new BadRequestException('Table ID is required for DINE_IN orders');
    }

    if (createOrderDto.tableId) {
      await this.ensureActiveTableBelongsToRestaurant(
        restaurantId,
        createOrderDto.tableId,
      );
    }

    const uniqueDishIds = [
      ...new Set(createOrderDto.items.map((item) => item.dishId)),
    ];
    const dishes = await this.prismaService.dish.findMany({
      where: {
        id: { in: uniqueDishIds },
        isAvailable: true,
        category: {
          restaurantId,
        },
      },
      select: {
        id: true,
        name: true,
        price: true,
        modifierRelation: {
          select: {
            modifierGroupId: true,
          },
        },
      },
    });

    if (dishes.length !== uniqueDishIds.length) {
      throw new BadRequestException('Some dishes are unavailable or not found');
    }

    const dishMap = new Map(dishes.map((dish) => [dish.id, dish]));

    const uniqueModifierOptionIds = [
      ...new Set(
        createOrderDto.items
          .flatMap((item) => item.modifiers ?? [])
          .map((modifier) => modifier.modifierOptionId),
      ),
    ];

    const modifierOptionMap = await this.getModifierOptionMap(
      uniqueModifierOptionIds,
      restaurantId,
    );

    const itemsToCreate = createOrderDto.items.map((item) => {
      const dish = dishMap.get(item.dishId);

      if (!dish) {
        throw new BadRequestException(
          'Some dishes are unavailable or not found',
        );
      }

      const allowedGroupIds = new Set(
        dish.modifierRelation.map((modifier) => modifier.modifierGroupId),
      );

      const modifiersPayload = (item.modifiers ?? []).map((modifier) => {
        const modifierOption = modifierOptionMap.get(modifier.modifierOptionId);

        if (!modifierOption) {
          throw new BadRequestException(
            `Modifier option ${modifier.modifierOptionId} not found or unavailable`,
          );
        }

        if (!allowedGroupIds.has(modifierOption.modifierGroupId)) {
          throw new BadRequestException(
            `Modifier option ${modifier.modifierOptionId} is not allowed for dish ${item.dishId}`,
          );
        }

        const modifierQuantity = modifier.quantity ?? 1;

        return {
          name: modifierOption.name,
          price: modifierOption.price,
          quantity: modifierQuantity,
        };
      });

      const modifiersUnitPrice = modifiersPayload.reduce(
        (sum, modifier) => sum + modifier.price * modifier.quantity,
        0,
      );

      const modifierNames = modifiersPayload
        .map((m) => `${m.name} (x${m.quantity})`)
        .join(', ');
      const itemName = modifierNames
        ? `${dish.name} [${modifierNames}]`
        : dish.name;

      return {
        dishId: item.dishId,
        name: itemName,
        quantity: item.quantity,
        price: dish.price + modifiersUnitPrice,
      };
    });

    const totalAmount = itemsToCreate.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    const order = await this.prismaService.order.create({
      data: {
        restaurantId,
        type: orderType,
        tableId: createOrderDto.tableId,
        totalAmount,
        items: {
          create: itemsToCreate,
        },
      },
      include: {
        table: {
          select: {
            id: true,
            number: true,
            type: true,
          },
        },
        items: true,
      },
    });

    return {
      message: 'Order created successfully',
      order: this.mapOrder(order),
    };
  }

  async getOrders(restaurantId: number, userId: number, status?: OrderStatus) {
    await this.ensureRestaurantOwner(restaurantId, userId);

    const orders = await this.prismaService.order.findMany({
      where: {
        restaurantId,
        status,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        table: {
          select: {
            id: true,
            number: true,
            type: true,
          },
        },
        items: true,
      },
    });

    return orders.map((order) => this.mapOrder(order));
  }

  async getOrderById(restaurantId: number, orderId: string, userId: number) {
    await this.ensureRestaurantOwner(restaurantId, userId);

    const order = await this.prismaService.order.findFirst({
      where: {
        id: orderId,
        restaurantId,
      },
      include: {
        table: {
          select: {
            id: true,
            number: true,
            type: true,
          },
        },
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.mapOrder(order);
  }

  async updateOrder(
    restaurantId: number,
    orderId: string,
    updateOrderDto: UpdateOrderDto,
    userId: number,
  ) {
    await this.ensureRestaurantOwner(restaurantId, userId);
    await this.ensureOrderBelongsToRestaurant(restaurantId, orderId);

    if (updateOrderDto.tableId) {
      await this.ensureActiveTableBelongsToRestaurant(
        restaurantId,
        updateOrderDto.tableId,
      );
    }

    const updatedOrder = await this.prismaService.order.update({
      where: { id: orderId },
      data: updateOrderDto as any,
      include: {
        table: {
          select: {
            id: true,
            number: true,
            type: true,
          },
        },
        items: true,
      },
    });

    return {
      message: 'Order updated successfully',
      order: this.mapOrder(updatedOrder),
    };
  }

  async deleteOrder(restaurantId: number, orderId: string, userId: number) {
    await this.ensureRestaurantOwner(restaurantId, userId);
    await this.ensureOrderBelongsToRestaurant(restaurantId, orderId);

    await this.prismaService.order.delete({
      where: {
        id: orderId,
      },
    });

    return {
      message: 'Order deleted successfully',
    };
  }

  private async ensureRestaurantOwner(restaurantId: number, userId: number) {
    const restaurant = await this.prismaService.restaurant.findFirst({
      where: {
        id: restaurantId,
        ownerId: userId,
      },
      select: { id: true },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }
  }

  private async ensureActiveTableBelongsToRestaurant(
    restaurantId: number,
    tableId: string,
  ) {
    const table = await this.prismaService.diningTable.findFirst({
      where: {
        id: tableId,
        restaurantId,
        status: TableStatus.ACTIVE,
      },
      select: { id: true },
    });

    if (!table) {
      throw new BadRequestException('Table not found or inactive');
    }
  }

  private async ensureOrderBelongsToRestaurant(
    restaurantId: number,
    orderId: string,
  ) {
    const order = await this.prismaService.order.findFirst({
      where: {
        id: orderId,
        restaurantId,
      },
      select: { id: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }
  }

  private async getModifierOptionMap(
    modifierOptionIds: string[],
    restaurantId: number,
  ) {
    if (modifierOptionIds.length === 0) {
      return new Map<string, ModifierOptionLookup>();
    }

    const modifierOptions = await this.prismaService.fontModifierOption.findMany({
      where: {
        id: { in: modifierOptionIds },
        isAvailable: true,
        modifierGroup: {
          restaurantId,
        },
      },
      select: {
        id: true,
        name: true,
        price: true,
        modifierGroupId: true,
      },
    });

    if (modifierOptions.length !== modifierOptionIds.length) {
      throw new BadRequestException(
        'Some modifier options are unavailable or not found',
      );
    }

    return new Map(modifierOptions.map((option) => [option.id, option]));
  }

  private mapOrder(order: any) {
    return {
      id: order.id,
      restaurantId: order.restaurantId,
      tableId: order.tableId,
      type: order.type,
      status: order.status,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      table: order.table,
      items: (order.items || []).map((item: any) => ({
        id: item.id,
        dishId: item.dishId,
        dishName: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        lineTotal: item.quantity * item.price,
        modifiers: [],
      })),
    };
  }
}