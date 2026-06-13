import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, OrderType } from '@prisma/client';
import { LiveMonitorGateway } from '../live-monitor/live-monitor.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { AppendOrderItemsDto } from './dto/append-order-items.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly liveMonitorGateway: LiveMonitorGateway,
  ) {}

  async createPublicOrder(
    restaurantId: number,
    createOrderDto: CreateOrderDto,
  ) {
    if (!createOrderDto.tableId) {
      throw new BadRequestException('Table ID is required for public orders');
    }
    if (createOrderDto.type && createOrderDto.type !== OrderType.DINE_IN) {
      throw new BadRequestException('Public orders support only DINE_IN type');
    }
    return this.createOrderInternal(restaurantId, {
      ...createOrderDto,
      type: OrderType.DINE_IN,
    });
  }

  async createOrder(
    restaurantId: number,
    createOrderDto: CreateOrderDto,
    userId: number,
  ) {
    await this.ensureRestaurantOwner(restaurantId, userId);
    return this.createOrderInternal(restaurantId, createOrderDto);
  }

  async appendItemsToPublicOrder(
    restaurantId: number,
    orderId: string,
    appendOrderItemsDto: AppendOrderItemsDto,
  ) {
    const existingOrder = await this.prisma.order.findFirst({
      where: { id: orderId, restaurantId },
      select: {
        id: true,
        tableId: true,
        status: true,
      },
    });

    if (!existingOrder) {
      throw new NotFoundException('Order not found');
    }

    if (
      existingOrder.status === OrderStatus.COMPLETED ||
      existingOrder.status === OrderStatus.CANCELED
    ) {
      throw new BadRequestException('Order is already closed');
    }

    if (!existingOrder.tableId) {
      throw new BadRequestException('Order has no table assigned');
    }

    await this.ensureActiveTableBelongsToRestaurant(
      restaurantId,
      existingOrder.tableId,
    );

    const { itemsToCreate, totalAmount } = await this.buildOrderItems(
      restaurantId,
      appendOrderItemsDto.items,
    );

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        totalAmount: { increment: totalAmount },
        items: { create: itemsToCreate },
      },
      include: {
        table: { select: { id: true, number: true, type: true } },
        items: {
          include: {
            dish: { select: { id: true, name: true } },
            modifiers: {
              include: {
                modifierOption: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    await this.liveMonitorGateway.emitOrdersChanged(
      restaurantId,
      'updated',
      updatedOrder.id,
    );

    return {
      message: 'Items appended successfully',
      order: this.mapOrder(updatedOrder),
    };
  }

  async callWaiterFromPublicMenu(restaurantId: number, tableId: string) {
    await this.ensureActiveTableBelongsToRestaurant(restaurantId, tableId);

    await this.prisma.diningTable.update({
      where: { id: tableId },
      data: {
        isWaiterCallActive: true,
        waiterCallRequestedAt: new Date(),
      },
    });

    await this.liveMonitorGateway.emitOrdersChanged(
      restaurantId,
      'updated',
      tableId,
    );

    return {
      message: 'Waiter call sent successfully',
      tableId,
    };
  }

  async findPublicOrderByCode(
    restaurantId: number,
    tableId: string,
    orderCode: string,
  ) {
    await this.ensureActiveTableBelongsToRestaurant(restaurantId, tableId);

    const normalizedCode = orderCode.trim().replace(/^#/, '').toLowerCase();

    if (!normalizedCode) {
      throw new BadRequestException('Order code is required');
    }

    const matchedOrders = await this.prisma.order.findMany({
      where: {
        restaurantId,
        tableId,
        id: {
          startsWith: normalizedCode,
          mode: 'insensitive',
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
      },
      take: 1,
    });

    if (matchedOrders.length === 0) {
      throw new NotFoundException('Order not found');
    }

    return {
      orderId: matchedOrders[0].id,
    };
  }

  async getPublicOrderById(
    restaurantId: number,
    tableId: string,
    orderId: string,
  ) {
    await this.ensureActiveTableBelongsToRestaurant(restaurantId, tableId);

    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        restaurantId,
        tableId,
      },
      include: {
        table: { select: { id: true, number: true, type: true } },
        items: {
          include: {
            dish: { select: { id: true, name: true } },
            modifiers: {
              include: {
                modifierOption: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return {
      order: this.mapOrder(order),
    };
  }

  private async createOrderInternal(
    restaurantId: number,
    createOrderDto: CreateOrderDto,
  ) {
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

    const { itemsToCreate, totalAmount } = await this.buildOrderItems(
      restaurantId,
      createOrderDto.items,
    );

    const order = await this.prisma.order.create({
      data: {
        restaurantId,
        type: orderType,
        tableId: createOrderDto.tableId,
        totalAmount,
        items: { create: itemsToCreate },
      },
      include: {
        table: { select: { id: true, number: true, type: true } },
        items: {
          include: {
            dish: { select: { id: true, name: true } },
            modifiers: {
              include: {
                modifierOption: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    await this.liveMonitorGateway.emitOrdersChanged(
      restaurantId,
      'created',
      order.id,
    );

    return {
      message: 'Order created successfully',
      order: this.mapOrder(order),
    };
  }

  private async buildOrderItems(
    restaurantId: number,
    items: CreateOrderDto['items'],
  ) {
    const uniqueDishIds = [...new Set(items.map((item) => item.dishId))];
    const dishes = await this.prisma.dish.findMany({
      where: {
        id: { in: uniqueDishIds },
        isAvailable: true,
        category: { restaurantId },
      },
      select: {
        id: true,
        price: true,
        name: true,
        modifiers: { select: { modifierGroupId: true } },
      },
    });

    if (dishes.length !== uniqueDishIds.length) {
      throw new BadRequestException('Some dishes are unavailable or not found');
    }

    const dishMap = new Map(dishes.map((dish) => [dish.id, dish]));
    const uniqueModifierOptionIds = [
      ...new Set(
        items
          .flatMap((item) => item.modifiers ?? [])
          .map((m) => m.modifierOptionId),
      ),
    ];

    const modifierOptionMap = await this.getModifierOptionMap(
      uniqueModifierOptionIds,
      restaurantId,
    );

    const itemsToCreate = items.map((item) => {
      const dish = dishMap.get(item.dishId);
      if (!dish) {
        throw new BadRequestException(
          'Some dishes are unavailable or not found',
        );
      }

      const allowedGroupIds = new Set(
        dish.modifiers.map((m) => m.modifierGroupId),
      );
      const modifiersPayload = (item.modifiers ?? []).map((modifier) => {
        const modifierOption = modifierOptionMap.get(modifier.modifierOptionId);
        if (!modifierOption) {
          throw new BadRequestException(
            `Modifier option ${modifier.modifierOptionId} not found`,
          );
        }
        if (!allowedGroupIds.has(modifierOption.modifierGroupId)) {
          throw new BadRequestException(
            `Modifier option ${modifier.modifierOptionId} not allowed`,
          );
        }
        return {
          modifierOptionId: modifierOption.id,
          quantity: modifier.quantity ?? 1,
          unitPrice: modifierOption.price,
        };
      });

      const modifiersUnitPrice = modifiersPayload.reduce(
        (sum, m) => sum + m.unitPrice * m.quantity,
        0,
      );

      return {
        dishId: item.dishId,
        quantity: item.quantity,
        unitPrice: dish.price + modifiersUnitPrice,
        modifiers: { create: modifiersPayload },
      };
    });

    const totalAmount = itemsToCreate.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );

    return { itemsToCreate, totalAmount };
  }

  async getOrders(restaurantId: number, userId: number, status?: OrderStatus) {
    await this.ensureRestaurantOwner(restaurantId, userId);
    const orders = await this.prisma.order.findMany({
      where: { restaurantId, status },
      orderBy: { createdAt: 'desc' },
      include: {
        table: { select: { id: true, number: true, type: true } },
        items: {
          include: {
            dish: { select: { id: true, name: true } },
            modifiers: {
              include: { modifierOption: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });
    return orders.map((order) => this.mapOrder(order));
  }

  async getOrderById(restaurantId: number, orderId: string, userId: number) {
    await this.ensureRestaurantOwner(restaurantId, userId);
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, restaurantId },
      include: {
        table: { select: { id: true, number: true, type: true } },
        items: {
          include: {
            dish: { select: { id: true, name: true } },
            modifiers: {
              include: { modifierOption: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
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

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: updateOrderDto,
      include: {
        table: { select: { id: true, number: true, type: true } },
        items: {
          include: {
            dish: { select: { id: true, name: true } },
            modifiers: {
              include: { modifierOption: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });

    await this.liveMonitorGateway.emitOrdersChanged(
      restaurantId,
      'updated',
      updatedOrder.id,
    );

    return {
      message: 'Order updated successfully',
      order: this.mapOrder(updatedOrder),
    };
  }

  async deleteOrder(restaurantId: number, orderId: string, userId: number) {
    await this.ensureRestaurantOwner(restaurantId, userId);
    await this.ensureOrderBelongsToRestaurant(restaurantId, orderId);
    await this.prisma.order.delete({ where: { id: orderId } });

    await this.liveMonitorGateway.emitOrdersChanged(
      restaurantId,
      'deleted',
      orderId,
    );

    return { message: 'Order deleted successfully' };
  }

  private async ensureRestaurantOwner(restaurantId: number, userId: number) {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: { id: restaurantId, ownerId: userId },
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
    const table = await this.prisma.diningTable.findFirst({
      where: {
        id: tableId,
        restaurantId,
        status: 'ACTIVE',
      },
      select: { id: true },
    });

    if (!table) {
      throw new BadRequestException(
        'Table is inactive or does not belong to restaurant',
      );
    }
  }

  private async ensureOrderBelongsToRestaurant(
    restaurantId: number,
    orderId: string,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, restaurantId },
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
      return new Map<
        string,
        { id: string; modifierGroupId: string; price: number }
      >();
    }

    const options = await this.prisma.modifierOption.findMany({
      where: {
        id: { in: modifierOptionIds },
        group: { restaurantId },
      },
      select: {
        id: true,
        modifierGroupId: true,
        price: true,
      },
    });

    if (options.length !== modifierOptionIds.length) {
      throw new BadRequestException(
        'Some modifier options are unavailable or not found',
      );
    }

    return new Map(options.map((option) => [option.id, option]));
  }

  private mapOrder(order: any) {
    return {
      ...order,
      items: order.items.map((item: any) => ({
        id: item.id,
        dishId: item.dishId,
        dishName: item.dish.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.quantity * item.unitPrice,
        modifiers: item.modifiers.map((modifier: any) => ({
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
