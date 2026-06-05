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

    const completedOrders = await this.prisma.order.findMany({
      where: { restaurantId, status: OrderStatus.COMPLETED },
      include: { items: { include: { dish: true } } },
    });

    const totalRevenue = completedOrders.reduce(
      (sum, o) => sum + o.totalAmount,
      0,
    );
    const totalOrders = completedOrders.length;
    const averageCheck = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const dishCounts: Record<
      string,
      { name: string; count: number; revenue: number }
    > = {};
    for (const order of completedOrders) {
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

      const dayOrders = completedOrders.filter(
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
