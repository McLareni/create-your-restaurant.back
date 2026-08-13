import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: PrismaService,
          useValue: {
            order: {
              aggregate: jest.fn(),
              groupBy: jest.fn(),
            },
            orderItem: {
              groupBy: jest.fn(),
            },
            dish: {
              findMany: jest.fn(),
            },
            user: {
              findMany: jest.fn(),
            },
            $queryRaw: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSummary', () => {
    it('should calculate defaults when dates are not provided', async () => {
      // Mock data
      (prisma.order.aggregate as jest.Mock).mockResolvedValue({
        _sum: { totalAmount: 1000 },
        _count: { id: 5 },
      });
      (prisma.orderItem.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.dish.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);
      (prisma.order.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getSummary(1);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prisma.order.aggregate).toHaveBeenCalled();
      expect(result.totalRevenue).toBe(1000);
      expect(result.totalOrders).toBe(5);
      expect(result.averageCheck).toBe(200);
      expect(result.chartData.length).toBeGreaterThan(0);
    });

    it('should map chart data correctly', async () => {
      // Mock data
      (prisma.order.aggregate as jest.Mock).mockResolvedValue({
        _sum: { totalAmount: 100 },
        _count: { id: 1 },
      });
      (prisma.orderItem.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.dish.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.order.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      const testDate = new Date('2023-01-10T00:00:00Z');
      (prisma.$queryRaw as jest.Mock).mockImplementation((query) => {
        if (query.join('').includes('hour_of_day')) {
          return Promise.resolve([]); // Peak hours mock
        }
        return Promise.resolve([{ day: testDate, revenue: 500 }]);
      });

      const startDate = '2023-01-09T00:00:00.000Z';
      const endDate = '2023-01-10T23:59:59.999Z';

      const result = await service.getSummary(1, startDate, endDate);

      const chartItem = result.chartData.find((c) => c.date === '10.01');
      expect(chartItem).toBeDefined();
      expect(chartItem?.revenue).toBe(500);
    });

    it('should handle division by zero in averageCheck', async () => {
      (prisma.order.aggregate as jest.Mock).mockResolvedValue({
        _sum: { totalAmount: null },
        _count: { id: 0 },
      });
      (prisma.orderItem.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.dish.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);
      (prisma.order.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getSummary(1);

      expect(result.totalRevenue).toBe(0);
      expect(result.averageCheck).toBe(0);
    });
  });
});
