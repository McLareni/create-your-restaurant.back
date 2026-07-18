import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private async checkAccess(restaurantId: number, userId: number) {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: { id: restaurantId, ownerId: userId },
    });
    if (!restaurant) throw new ForbiddenException('Access denied');
  }

  async getSummary(restaurantId: number, userId: number) {
    await this.checkAccess(restaurantId, userId);

    const aggregateResult = await this.prisma.order.aggregate({
      where: { restaurantId, status: OrderStatus.COMPLETED },
      _sum: { totalAmount: true },
      _count: { id: true },
    });

    const totalRevenue = aggregateResult._sum.totalAmount || 0;
    const totalOrders = aggregateResult._count.id || 0;
    const averageCheck = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const recentOrders = await this.prisma.order.findMany({
      where: {
        restaurantId,
        status: OrderStatus.COMPLETED,
        createdAt: { gte: sevenDaysAgo },
      },
      include: { items: { include: { dish: true } } },
    });

    const dishCounts: Record<
      string,
      { name: string; count: number; revenue: number }
    > = {};
    for (const order of recentOrders) {
      for (const item of order.items) {
        if (!dishCounts[item.dishId]) {
          dishCounts[item.dishId] = {
            name: item.dish.name,
            count: 0,
            revenue: 0,
          };
        }
        dishCounts[item.dishId].count += item.quantity;
        dishCounts[item.dishId].revenue += item.quantity * item.unitPrice;
      }
    }

    const topDishes = Object.values(dishCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const chartData: { date: string; revenue: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toLocaleDateString('uk-UA', {
        day: '2-digit',
        month: '2-digit',
      });
      const startOfDay = new Date(d.setHours(0, 0, 0, 0));
      const endOfDay = new Date(d.setHours(23, 59, 59, 999));

      const dayOrders = recentOrders.filter(
        (o) => o.createdAt >= startOfDay && o.createdAt <= endOfDay,
      );
      const revenue = dayOrders.reduce((sum, o) => sum + o.totalAmount, 0);
      chartData.push({ date: dateString, revenue });
    }

    return {
      totalRevenue,
      totalOrders,
      averageCheck,
      topDishes,
      chartData,
    };
  }
}
