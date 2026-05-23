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
        price: true,
        modifiers: {
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
        dish.modifiers.map((modifier) => modifier.modifierGroupId),
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
          modifierOptionId: modifierOption.id,
          quantity: modifierQuantity,
          unitPrice: modifierOption.price,
        };
      });

      const modifiersUnitPrice = modifiersPayload.reduce(
        (sum, modifier) => sum + modifier.unitPrice * modifier.quantity,
        0,
      );

      return {
        dishId: item.dishId,
        quantity: item.quantity,
        unitPrice: dish.price + modifiersUnitPrice,
        modifiers: {
          create: modifiersPayload,
        },
      };
    });

    const totalAmount = itemsToCreate.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
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
        items: {
          include: {
            dish: {
              select: {
                id: true,
                name: true,
              },
            },
            modifiers: {
              include: {
                modifierOption: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
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
        items: {
          include: {
            dish: {
              select: {
                id: true,
                name: true,
              },
            },
            modifiers: {
              include: {
                modifierOption: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
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
        items: {
          include: {
            dish: {
              select: {
                id: true,
                name: true,
              },
            },
            modifiers: {
              include: {
                modifierOption: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
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
      data: updateOrderDto,
      include: {
        table: {
          select: {
            id: true,
            number: true,
            type: true,
          },
        },
        items: {
          include: {
            dish: {
              select: {
                id: true,
                name: true,
              },
            },
            modifiers: {
              include: {
                modifierOption: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
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

    const modifierOptions = await this.prismaService.modifierOption.findMany({
      where: {
        id: { in: modifierOptionIds },
        isAvailable: true,
        group: {
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

  private mapOrder(order: {
    id: string;
    restaurantId: number;
    tableId: string | null;
    type: OrderType;
    status: OrderStatus;
    totalAmount: number;
    createdAt: Date;
    updatedAt: Date;
    table: {
      id: string;
      number: number;
      type: string;
    } | null;
    items: Array<{
      id: string;
      dishId: string;
      quantity: number;
      unitPrice: number;
      dish: {
        id: string;
        name: string;
      };
      modifiers: Array<{
        id: string;
        modifierOptionId: string;
        quantity: number;
        unitPrice: number;
        modifierOption: {
          id: string;
          name: string;
        };
      }>;
    }>;
  }) {
    return {
      ...order,
      items: order.items.map((item) => ({
        id: item.id,
        dishId: item.dishId,
        dishName: item.dish.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.quantity * item.unitPrice,
        modifiers: item.modifiers.map((modifier) => ({
          id: modifier.id,
          modifierOptionId: modifier.modifierOptionId,
          modifierName: modifier.modifierOption.name,
          quantity: modifier.quantity,
          unitPrice: modifier.unitPrice,
          lineTotal: modifier.quantity * modifier.unitPrice,
        })),
      })),
    };
  }
}
