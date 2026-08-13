import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(
    restaurantId: number,
    startDateStr?: string,
    endDateStr?: string,
  ) {
    const end = endDateStr ? new Date(endDateStr) : new Date();
    const start = startDateStr ? new Date(startDateStr) : new Date();

    if (!startDateStr) {
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
    }

    // Ensure end date includes the entire day if not explicitly set with time
    if (!endDateStr || !endDateStr.includes('T')) {
      end.setHours(23, 59, 59, 999);
    }

    const aggregateResult = await this.prisma.order.aggregate({
      where: {
        restaurantId,
        status: OrderStatus.COMPLETED,
        createdAt: { gte: start, lte: end },
      },
      _sum: { totalAmount: true },
      _count: { id: true },
    });

    const totalRevenue = aggregateResult._sum.totalAmount ?? 0;
    const totalOrders = aggregateResult._count.id ?? 0;
    const averageCheck = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const topItemsAggregation = await this.prisma.orderItem.groupBy({
      by: ['dishId'],
      where: {
        order: {
          restaurantId,
          status: OrderStatus.COMPLETED,
          createdAt: { gte: start, lte: end },
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
        AND "createdAt" >= ${start}
        AND "createdAt" <= ${end}
      GROUP BY DATE_TRUNC('day', "createdAt")
      ORDER BY day ASC;
    `;

    const chartMap = new Map<string, number>();
    for (const row of rawChartData) {
      const d = new Date(row.day);
      const day = String(d.getUTCDate()).padStart(2, '0');
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const dateString = `${day}.${month}`;
      chartMap.set(dateString, Number(row.revenue));
    }

    const chartData: { date: string; revenue: number }[] = [];

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const daysToIterate = Math.min(diffDays, 30); // limit to 30 days for chart

    for (let i = daysToIterate - 1; i >= 0; i--) {
      // Create a date in UTC representing the day to ensure it matches chartMap
      const d = new Date(
        Date.UTC(end.getFullYear(), end.getMonth(), end.getDate() - i),
      );
      const day = String(d.getUTCDate()).padStart(2, '0');
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const dateString = `${day}.${month}`;

      chartData.push({
        date: dateString,
        revenue: chartMap.get(dateString) ?? 0,
      });
    }

    // Orders by Type
    const typeAggregation = await this.prisma.order.groupBy({
      by: ['type'],
      where: {
        restaurantId,
        status: OrderStatus.COMPLETED,
        createdAt: { gte: start, lte: end },
      },
      _sum: { totalAmount: true },
      _count: { id: true },
    });
    const ordersByType = typeAggregation.map((agg) => ({
      type: agg.type,
      revenue: agg._sum.totalAmount ?? 0,
      count: agg._count.id ?? 0,
    }));

    // Peak Hours
    const rawPeakHours = await this.prisma.$queryRaw<
      { hour_of_day: number; count: number }[]
    >`
      SELECT EXTRACT(HOUR FROM "createdAt")::int as hour_of_day, COUNT(id)::int as count
      FROM "Order"
      WHERE "restaurantId" = ${restaurantId}
        AND "createdAt" >= ${start}
        AND "createdAt" <= ${end}
      GROUP BY EXTRACT(HOUR FROM "createdAt")
      ORDER BY hour_of_day ASC;
    `;
    const peakHours = rawPeakHours.map((row) => ({
      hour: `${String(row.hour_of_day).padStart(2, '0')}:00`,
      ordersCount: Number(row.count),
    }));

    // Waiter Performance
    const waiterAggregation = await this.prisma.order.groupBy({
      by: ['waiterId'],
      where: {
        restaurantId,
        status: OrderStatus.COMPLETED,
        createdAt: { gte: start, lte: end },
        waiterId: { not: null },
      },
      _sum: { totalAmount: true },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    const waiterIds = waiterAggregation.map((a) => a.waiterId as number);
    const waitersInfo = await this.prisma.user.findMany({
      where: { id: { in: waiterIds } },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    const waiterMap = new Map(waitersInfo.map((w) => [w.id, w]));

    const waiterPerformance = waiterAggregation.map((agg) => {
      const w = waiterMap.get(agg.waiterId as number);
      return {
        waiterId: agg.waiterId,
        name: w
          ? `${w.firstName ?? ''} ${w.lastName ?? ''}`.trim() || w.email
          : 'Unknown',
        completedOrders: agg._count.id ?? 0,
        revenueGenerated: agg._sum.totalAmount ?? 0,
      };
    });

    return {
      totalRevenue,
      totalOrders,
      averageCheck,
      topDishes,
      chartData,
      ordersByType,
      peakHours,
      waiterPerformance,
    };
  }
}
