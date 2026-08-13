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

  async getTablesWithActiveOrders(restaurantId: number) {
    return this.getTablesWithActiveOrdersSnapshot(restaurantId);
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
        waiterCallType: true,
        zone: true,
        orders: {
          where: {
            status: { in: ACTIVE_ORDER_STATUSES },
          },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            orderNumber: true,
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
      waiterCallType: table.waiterCallType,
      zone: table.zone,
      activeOrderCount: table.orders.length,
      activeOrdersTotalAmount,
      activeOrders: table.orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
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
        waiterCallType: true,
        zone: true,
        orders: {
          where: {
            status: { in: ACTIVE_ORDER_STATUSES },
          },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            orderNumber: true,
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
          waiterCallType: table.waiterCallType,
          zone: table.zone,
          activeOrderCount: table.orders.length,
          activeOrdersTotalAmount,
          activeOrders: table.orders.map((order) => ({
            id: order.id,
            orderNumber: order.orderNumber,
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

  async getHistorySnapshot(restaurantId: number, dateString?: string) {
    const startOfDay = dateString ? new Date(dateString) : new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);

    const orders = await this.prisma.order.findMany({
      where: {
        restaurantId,
        status: { in: [OrderStatus.COMPLETED, OrderStatus.CANCELED] },
        updatedAt: { gte: startOfDay, lte: endOfDay },
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        type: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        updatedAt: true,
        table: {
          select: {
            id: true,
            number: true,
            zone: true,
          },
        },
        items: {
          select: {
            id: true,
            dishId: true,
            quantity: true,
            unitPrice: true,
            dish: {
              select: { name: true },
            },
          },
        },
      },
    });

    return {
      restaurantId,
      generatedAt: new Date().toISOString(),
      orders: orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        type: order.type,
        status: order.status,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        table: order.table
          ? {
              id: order.table.id,
              number: order.table.number,
              zone: order.table.zone,
            }
          : null,
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
}
