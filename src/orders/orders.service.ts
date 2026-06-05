import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, OrderType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrdersValidationService } from './orders-validation.service';
import { OrdersInventoryService } from './orders-inventory.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validationService: OrdersValidationService,
    private readonly inventoryService: OrdersInventoryService,
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
    await this.validationService.ensureRestaurantOwner(restaurantId, userId);
    return this.createOrderInternal(restaurantId, createOrderDto);
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
      await this.validationService.ensureActiveTableBelongsToRestaurant(
        restaurantId,
        createOrderDto.tableId,
      );
    }

    const uniqueDishIds = [
      ...new Set(createOrderDto.items.map((item) => item.dishId)),
    ];
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
        ingredients: {
          where: { NOT: { inventoryItemId: null } },
          select: { inventoryItemId: true, quantity: true, name: true },
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
          .map((m) => m.modifierOptionId),
      ),
    ];

    const modifierOptionMap = await this.validationService.getModifierOptionMap(
      uniqueModifierOptionIds,
      restaurantId,
    );
    const inventoryRequirements = new Map<
      string,
      { amount: number; name: string }
    >();

    for (const item of createOrderDto.items) {
      const dish = dishMap.get(item.dishId);
      if (!dish) continue;

      for (const ing of dish.ingredients) {
        if (!ing.inventoryItemId) continue;
        const totalNeeded = ing.quantity * item.quantity;
        const existing = inventoryRequirements.get(ing.inventoryItemId);
        if (existing) {
          existing.amount += totalNeeded;
        } else {
          inventoryRequirements.set(ing.inventoryItemId, {
            amount: totalNeeded,
            name: ing.name,
          });
        }
      }
    }

    const itemsToCreate = createOrderDto.items.map((item) => {
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

    const order = await this.prisma.$transaction(async (tx) => {
      await this.inventoryService.processInventoryRequirements(
        tx,
        restaurantId,
        inventoryRequirements,
      );

      return tx.order.create({
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
    });

    return {
      message: 'Order created successfully',
      order: this.mapOrder(order),
    };
  }

  async getOrders(restaurantId: number, userId: number, status?: OrderStatus) {
    await this.validationService.ensureRestaurantOwner(restaurantId, userId);
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
    await this.validationService.ensureRestaurantOwner(restaurantId, userId);
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
    await this.validationService.ensureRestaurantOwner(restaurantId, userId);
    await this.validationService.ensureOrderBelongsToRestaurant(
      restaurantId,
      orderId,
    );

    if (updateOrderDto.tableId) {
      await this.validationService.ensureActiveTableBelongsToRestaurant(
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
    return {
      message: 'Order updated successfully',
      order: this.mapOrder(updatedOrder),
    };
  }

  async deleteOrder(restaurantId: number, orderId: string, userId: number) {
    await this.validationService.ensureRestaurantOwner(restaurantId, userId);
    await this.validationService.ensureOrderBelongsToRestaurant(
      restaurantId,
      orderId,
    );
    await this.prisma.order.delete({ where: { id: orderId } });
    return { message: 'Order deleted successfully' };
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
