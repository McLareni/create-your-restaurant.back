import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, OrderType, PrismaClient } from '@prisma/client';
import { LiveMonitorGateway } from 'src/live-monitor/live-monitor.gateway';
import { PrismaService } from 'src/prisma/prisma.service';
import { DataMappingUtil } from 'src/common/utils/mapping.util';
import type { AppendOrderItemsDto } from 'src/orders/dto/append-order-items.dto';
import type { CreateOrderDto } from 'src/orders/dto/create-order.dto';
import type { UpdateOrderDto } from 'src/orders/dto/update-order.dto';

type TxClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

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
      throw new BadRequestException('errors.table_id_required');
    }
    if (createOrderDto.type && createOrderDto.type !== OrderType.DINE_IN) {
      throw new BadRequestException('errors.only_dine_in_supported');
    }
    return this.createOrderInternal(restaurantId, {
      ...createOrderDto,
      type: OrderType.DINE_IN,
    });
  }

  async createOrder(restaurantId: number, createOrderDto: CreateOrderDto) {
    return this.createOrderInternal(restaurantId, createOrderDto);
  }

  async appendItemsToPublicOrder(
    restaurantId: number,
    orderId: string,
    appendOrderItemsDto: AppendOrderItemsDto,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      const existingOrder = await tx.order.findFirst({
        where: { id: orderId, restaurantId },
        select: {
          id: true,
          tableId: true,
          status: true,
        },
      });

      if (!existingOrder) {
        throw new NotFoundException('errors.order_not_found');
      }
      if (
        existingOrder.status === OrderStatus.COMPLETED ||
        existingOrder.status === OrderStatus.PAID ||
        existingOrder.status === OrderStatus.CANCELED
      ) {
        throw new BadRequestException('errors.order_closed');
      }
      if (!existingOrder.tableId) {
        throw new BadRequestException('errors.order_no_table');
      }

      await this.ensureActiveTableBelongsToRestaurant(
        restaurantId,
        existingOrder.tableId,
        tx,
      );

      const { itemsToCreate, totalAmount } = await this.buildOrderItems(
        restaurantId,
        appendOrderItemsDto.items,
        tx,
      );

      return await tx.order.update({
        where: { id: orderId },
        data: {
          totalAmount: { increment: totalAmount },
          items: { create: itemsToCreate },
        },
        include: {
          table: { select: { id: true, number: true, type: true } },
          items: {
            include: {
              dish: true,
              modifiers: {
                include: {
                  modifierOption: true,
                },
              },
            },
          },
        },
      });
    });

    if (result.tableId) {
      await this.liveMonitorGateway.emitOrdersChanged(
        restaurantId,
        'updated',
        result.id,
        result.tableId,
      );
    }

    return {
      message: 'success.items_appended',
      order: DataMappingUtil.mapOrder(result),
    };
  }

  async findPublicOrderByCode(
    restaurantId: number,
    tableId: string,
    orderCode: string,
  ) {
    await this.ensureActiveTableBelongsToRestaurant(
      restaurantId,
      tableId,
      this.prisma,
    );

    const normalizedCode = orderCode.trim().replace(/^#/, '').toLowerCase();
    if (!normalizedCode) {
      throw new BadRequestException('errors.order_code_required');
    }

    const numericOrderNumber = Number(normalizedCode);
    const isOrderNumber =
      /^\d+$/.test(normalizedCode) && Number.isSafeInteger(numericOrderNumber);

    const matchedOrders = await this.prisma.order.findMany({
      where: {
        restaurantId,
        tableId,
        status: {
          notIn: [
            OrderStatus.COMPLETED,
            OrderStatus.PAID,
            OrderStatus.CANCELED,
          ],
        },
        OR: [
          ...(isOrderNumber ? [{ orderNumber: numericOrderNumber }] : []),
          {
            id: {
              startsWith: normalizedCode,
              mode: 'insensitive',
            },
          },
        ],
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
      throw new NotFoundException('errors.order_not_found');
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
    await this.ensureActiveTableBelongsToRestaurant(
      restaurantId,
      tableId,
      this.prisma,
    );
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        restaurantId,
        tableId,
        status: {
          notIn: [
            OrderStatus.COMPLETED,
            OrderStatus.PAID,
            OrderStatus.CANCELED,
          ],
        },
      },
      include: {
        table: { select: { id: true, number: true, type: true } },
        items: {
          include: {
            dish: true,
            modifiers: {
              include: {
                modifierOption: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('errors.order_not_found');
    }

    return {
      order: DataMappingUtil.mapOrder(order),
    };
  }

  async payPublicOrder(restaurantId: number, tableId: string, orderId: string) {
    await this.ensureActiveTableBelongsToRestaurant(
      restaurantId,
      tableId,
      this.prisma,
    );

    const existingOrder = await this.prisma.order.findFirst({
      where: { id: orderId, restaurantId, tableId },
      select: { id: true, status: true },
    });

    if (!existingOrder) {
      throw new NotFoundException('errors.order_not_found');
    }
    if (existingOrder.status === OrderStatus.CANCELED) {
      throw new BadRequestException('errors.order_closed');
    }

    const paidOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.PAID },
      include: {
        table: { select: { id: true, number: true, type: true } },
        items: {
          include: {
            dish: true,
            modifiers: { include: { modifierOption: true } },
          },
        },
      },
    });

    if (paidOrder.tableId) {
      await this.liveMonitorGateway.emitOrdersChanged(
        restaurantId,
        'updated',
        paidOrder.id,
        paidOrder.tableId,
      );
    }

    return {
      message: 'success.order_paid',
      order: DataMappingUtil.mapOrder(paidOrder),
    };
  }

  private async createOrderInternal(
    restaurantId: number,
    createOrderDto: CreateOrderDto,
  ) {
    const orderType = createOrderDto.type ?? OrderType.DINE_IN;

    if (orderType === OrderType.DINE_IN && !createOrderDto.tableId) {
      throw new BadRequestException('errors.table_id_required');
    }

    const order = await this.prisma.$transaction(async (tx) => {
      if (createOrderDto.tableId) {
        await this.ensureActiveTableBelongsToRestaurant(
          restaurantId,
          createOrderDto.tableId,
          tx,
        );
      }

      const { itemsToCreate, totalAmount } = await this.buildOrderItems(
        restaurantId,
        createOrderDto.items,
        tx,
      );

      return await tx.order.create({
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
              dish: true,
              modifiers: {
                include: {
                  modifierOption: true,
                },
              },
            },
          },
        },
      });
    });

    if (order.tableId) {
      await this.liveMonitorGateway.emitOrdersChanged(
        restaurantId,
        'created',
        order.id,
        order.tableId,
      );
    }

    return {
      message: 'success.order_created',
      order: DataMappingUtil.mapOrder(order),
    };
  }

  private async buildOrderItems(
    restaurantId: number,
    items: CreateOrderDto['items'],
    tx: TxClient,
  ) {
    const uniqueDishIds = [...new Set(items.map((item) => item.dishId))];
    const dishes = await tx.dish.findMany({
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
      throw new BadRequestException('errors.dishes_unavailable');
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
      tx,
    );

    const itemsToCreate = items.map((item) => {
      const dish = dishMap.get(item.dishId);
      if (!dish) {
        throw new BadRequestException('errors.dishes_unavailable');
      }

      const allowedGroupIds = new Set(
        dish.modifiers.map((m) => m.modifierGroupId),
      );

      const modifiersPayload = (item.modifiers ?? []).map((modifier) => {
        const modifierOption = modifierOptionMap.get(modifier.modifierOptionId);
        if (!modifierOption) {
          throw new BadRequestException('errors.modifier_not_found');
        }
        if (!allowedGroupIds.has(modifierOption.modifierGroupId)) {
          throw new BadRequestException('errors.modifier_not_allowed');
        }
        return {
          modifierOptionId: modifier.modifierOptionId,
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

  async getOrders(
    restaurantId: number,
    userId: number,
    status?: OrderStatus,
    page = 1,
    limit = 50,
  ) {
    const where = { restaurantId, ...(status && { status }) };

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
        include: {
          table: { select: { id: true, number: true, type: true } },
          items: {
            include: {
              dish: true,
              modifiers: {
                include: { modifierOption: true },
              },
            },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders.map((order) => DataMappingUtil.mapOrder(order)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOrderById(restaurantId: number, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, restaurantId },
      include: {
        table: { select: { id: true, number: true, type: true } },
        items: {
          include: {
            dish: true,
            modifiers: {
              include: { modifierOption: true },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('errors.order_not_found');
    }
    return DataMappingUtil.mapOrder(order);
  }

  async updateOrder(
    restaurantId: number,
    orderId: string,
    updateOrderDto: UpdateOrderDto,
    userId: number,
  ) {
    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      await this.ensureOrderBelongsToRestaurant(restaurantId, orderId, tx);

      if (updateOrderDto.tableId) {
        await this.ensureActiveTableBelongsToRestaurant(
          restaurantId,
          updateOrderDto.tableId,
          tx,
        );
      }

      const currentOrder = await tx.order.findFirst({
        where: { id: orderId },
        select: { waiterId: true, status: true },
      });

      const dataToUpdate: any = { ...updateOrderDto };

      if (
        updateOrderDto.status === OrderStatus.IN_PROGRESS &&
        currentOrder?.status === OrderStatus.PENDING &&
        !currentOrder?.waiterId
      ) {
        dataToUpdate.waiterId = userId;
      }

      return await tx.order.update({
        where: { id: orderId },
        data: dataToUpdate,
        include: {
          table: { select: { id: true, number: true, type: true } },
          items: {
            include: {
              dish: true,
              modifiers: {
                include: { modifierOption: true },
              },
            },
          },
        },
      });
    });

    if (updatedOrder.tableId) {
      await this.liveMonitorGateway.emitOrdersChanged(
        restaurantId,
        'updated',
        updatedOrder.id,
        updatedOrder.tableId,
      );
    }

    return {
      message: 'success.order_updated',
      order: DataMappingUtil.mapOrder(updatedOrder),
    };
  }

  async deleteOrder(restaurantId: number, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, restaurantId },
      select: { id: true, tableId: true },
    });

    if (!order) {
      throw new NotFoundException('errors.order_not_found');
    }

    await this.prisma.order.delete({ where: { id: orderId } });

    if (order.tableId) {
      await this.liveMonitorGateway.emitOrdersChanged(
        restaurantId,
        'deleted',
        orderId,
        order.tableId,
      );
    }

    return { message: 'success.order_deleted' };
  }

  private async ensureActiveTableBelongsToRestaurant(
    restaurantId: number,
    tableId: string,
    tx: TxClient,
  ) {
    const table = await tx.diningTable.findFirst({
      where: {
        id: tableId,
        restaurantId,
        status: 'ACTIVE',
      },
      select: { id: true },
    });
    if (!table) {
      throw new BadRequestException('errors.table_inactive_or_invalid');
    }
  }

  private async ensureOrderBelongsToRestaurant(
    restaurantId: number,
    orderId: string,
    tx: TxClient,
  ) {
    const order = await tx.order.findFirst({
      where: { id: orderId, restaurantId },
      select: { id: true },
    });
    if (!order) {
      throw new NotFoundException('errors.order_not_found');
    }
  }

  private async getModifierOptionMap(
    modifierOptionIds: string[],
    restaurantId: number,
    tx: TxClient,
  ) {
    if (modifierOptionIds.length === 0) {
      return new Map<
        string,
        { id: string; modifierGroupId: string; price: number }
      >();
    }
    const options = await tx.modifierOption.findMany({
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
      throw new BadRequestException('errors.modifiers_unavailable');
    }
    return new Map(options.map((option) => [option.id, option]));
  }
}
