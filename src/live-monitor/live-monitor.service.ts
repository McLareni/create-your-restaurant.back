import { ForbiddenException, Injectable } from '@nestjs/common';
import { OrderStatus, TableStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.IN_PROGRESS,
  OrderStatus.READY,
];

@Injectable()
export class LiveMonitorService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureRestaurantAccess(restaurantId: number, userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, restaurantId: true, isActive: true },
    });

    if (!user) {
      throw new ForbiddenException('errors.access_denied');
    }

    if (user.role === 'OWNER') {
      const restaurant = await this.prisma.restaurant.findFirst({
        where: { id: restaurantId, ownerId: userId },
        select: { id: true },
      });

      if (!restaurant) {
        throw new ForbiddenException('errors.access_denied');
      }
    } else {
      if (user.restaurantId !== restaurantId || !user.isActive) {
        throw new ForbiddenException('errors.access_denied');
      }
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
      throw new ForbiddenException('errors.access_denied');
    }

    await this.prisma.diningTable.update({
      where: { id: tableId },
      data: {
        isWaiterCallActive: false,
        waiterCallRequestedAt: null,
      },
    });

    return {
      message: 'responses.waiter_call_resolved',
      tableId,
    };
  }

  async getSingleTableSnapshot(restaurantId: number, tableId: string) {
    const table = await this.prisma.diningTable.findFirst({
      where: {
        id: tableId,
        restaurantId,
        status: TableStatus.ACTIVE,
      },
      select: {
        id: true,
        number: true,
        type: true,
        status: true,
        isWaiterCallActive: true,
        waiterCallRequestedAt: true,
        zone: true,
        orders: {
          where: {
            status: { in: ACTIVE_ORDER_STATUSES },
          },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            type: true,
            status: true,
            totalAmount: true,
            createdAt: true,
            updatedAt: true,
            items: {
              select: {
                id: true,
                dishId: true,
                quantity: true,
                unitPrice: true,
                dish: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!table) return null;

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
  }

  async getTablesWithActiveOrdersSnapshot(restaurantId: number) {
    const tables = await this.prisma.diningTable.findMany({
      where: {
        restaurantId,
        status: TableStatus.ACTIVE,
      },
      orderBy: { number: 'asc' },
      select: {
        id: true,
        number: true,
        type: true,
        status: true,
        isWaiterCallActive: true,
        waiterCallRequestedAt: true,
        zone: true,
        orders: {
          where: {
            status: { in: ACTIVE_ORDER_STATUSES },
          },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            type: true,
            status: true,
            totalAmount: true,
            createdAt: true,
            updatedAt: true,
            items: {
              select: {
                id: true,
                dishId: true,
                quantity: true,
                unitPrice: true,
                dish: {
                  select: {
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
