import { ForbiddenException, Injectable } from '@nestjs/common';
import { OrderStatus, TableStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.IN_PROGRESS,
  OrderStatus.READY,
];

@Injectable()
export class LiveMonitorService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureRestaurantAccess(restaurantId: number, userId: number) {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: { id: restaurantId, ownerId: userId },
      select: { id: true },
    });

    if (!restaurant) {
      throw new ForbiddenException('Access to this restaurant is denied');
    }
  }

  async getTablesWithActiveOrders(restaurantId: number, userId: number) {
    await this.ensureRestaurantAccess(restaurantId, userId);

    return this.getTablesWithActiveOrdersSnapshot(restaurantId);
  }

  async resolveWaiterCall(
    restaurantId: number,
    tableId: string,
    userId: number,
  ) {
    await this.ensureRestaurantAccess(restaurantId, userId);

    const table = await this.prisma.diningTable.findFirst({
      where: {
        id: tableId,
        restaurantId,
      },
      select: { id: true },
    });

    if (!table) {
      throw new ForbiddenException('Access to this table is denied');
    }

    await this.prisma.diningTable.update({
      where: { id: tableId },
      data: {
        isWaiterCallActive: false,
        waiterCallRequestedAt: null,
      },
    });

    return {
      message: 'Waiter call resolved successfully',
      tableId,
    };
  }

  async getTablesWithActiveOrdersSnapshot(restaurantId: number) {
    const tables = await this.prisma.diningTable.findMany({
      where: {
        restaurantId,
        status: TableStatus.ACTIVE,
      },
      orderBy: { number: 'asc' },
      include: {
        orders: {
          where: {
            status: { in: ACTIVE_ORDER_STATUSES },
          },
          orderBy: { createdAt: 'desc' },
          include: {
            items: {
              include: {
                dish: {
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
      restaurantId,
      generatedAt: new Date().toISOString(),
      tables: tables.map((table) => {
        const activeOrdersTotalAmount = table.orders.reduce(
          (sum, order) => sum + order.totalAmount,
          0,
        );

        return {
          id: table.id,
          number: table.number,
          type: table.type,
          status: table.status,
          isWaiterCallActive: table.isWaiterCallActive,
          waiterCallRequestedAt: table.waiterCallRequestedAt,
          zone: table.zone,
          activeOrderCount: table.orders.length,
          activeOrdersTotalAmount,
          activeOrders: table.orders.map((order) => ({
            id: order.id,
            type: order.type,
            status: order.status,
            totalAmount: order.totalAmount,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            items: order.items.map((item) => ({
              id: item.id,
              dishId: item.dishId,
              dishName: item.dish.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: item.quantity * item.unitPrice,
            })),
          })),
        };
      }),
    };
  }
}
