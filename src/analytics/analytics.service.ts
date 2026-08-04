import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(restaurantId: number) {
    const aggregateResult = await this.prisma.order.aggregate({
      where: { restaurantId, status: OrderStatus.COMPLETED },
      _sum: { totalAmount: true },
      _count: { id: true },
    });

    const totalRevenue = aggregateResult._sum.totalAmount ?? 0;
    const totalOrders = aggregateResult._count.id ?? 0;
    const averageCheck = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const topItemsAggregation = await this.prisma.orderItem.groupBy({
      by: ['dishId'],
      where: {
        order: {
          restaurantId,
          status: OrderStatus.COMPLETED,
          createdAt: { gte: sevenDaysAgo },
        },
      },
      _sum: {
        quantity: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: 5,
    });

    const dishIds = topItemsAggregation.map((item) => item.dishId);
    const dishesInfo = await this.prisma.dish.findMany({
      where: { id: { in: dishIds } },
      select: { id: true, name: true, price: true },
    });

    const dishMap = new Map(dishesInfo.map((d) => [d.id, d]));

    const topDishes = topItemsAggregation.map((agg) => {
      const dish = dishMap.get(agg.dishId);
      const count = agg._sum.quantity ?? 0;
      return {
        name: dish?.name ?? 'Unknown',
        count,
        revenue: count * (dish?.price ?? 0),
      };
    });

    const rawChartData = await this.prisma.$queryRaw<
      { day: Date; revenue: number }[]
    >`
      SELECT DATE_TRUNC('day', "createdAt") as day, SUM("totalAmount") as revenue
      FROM "Order"
      WHERE "restaurantId" = ${restaurantId}
        AND "status" = 'COMPLETED'::"OrderStatus"
        AND "createdAt" >= ${sevenDaysAgo}
      GROUP BY DATE_TRUNC('day', "createdAt")
      ORDER BY day ASC;
    `;

    const chartMap = new Map<string, number>();
    for (const row of rawChartData) {
      const dateString = new Date(row.day).toLocaleDateString('uk-UA', {
        day: '2-digit',
        month: '2-digit',
      });
      chartMap.set(dateString, Number(row.revenue));
    }

    const chartData: { date: string; revenue: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toLocaleDateString('uk-UA', {
        day: '2-digit',
        month: '2-digit',
      });

      chartData.push({
        date: dateString,
        revenue: chartMap.get(dateString) ?? 0,
      });
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
