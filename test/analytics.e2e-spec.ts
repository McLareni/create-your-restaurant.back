import { describe, beforeAll, afterAll, it, expect } from '@jest/globals';
import type { TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/prisma/prisma.service';

describe('AnalyticsModule (e2e)', () => {
  jest.setTimeout(30000);
  let app: INestApplication;
  let prisma: PrismaService;
  let restaurantId: number;
  let ownerToken: string;
  let managerNoAnalyticsToken: string;
  let managerWithAnalyticsToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    prisma = app.get(PrismaService);

    // 1. Create Owner User
    const owner = await prisma.user.create({
      data: {
        email: 'owner-analytics-e2e@example.com',
        role: 'OWNER',
        isActive: true,
      },
    });

    const ownerSession = await prisma.session.create({
      data: {
        userId: owner.id,
        token: 'test-session-owner-analytics',
        expiresAt: new Date(Date.now() + 1000000),
      },
    });
    ownerToken = ownerSession.token;

    // 2. Create Restaurant
    const rest = await prisma.restaurant.create({
      data: {
        title: 'Analytics Restaurant',
        slug: 'analytics-rest',
        type: 'CAFE',
        currency: 'USD',
        language: 'UA',
        ownerId: owner.id,
        activeModules: ['analytics', 'orders'],
      },
    });
    restaurantId = rest.id;

    // 3. Create Managers
    const managerNoAnalytics = await prisma.user.create({
      data: {
        email: 'manager-no-analytics@example.com',
        role: 'STAFF',
        isActive: true,
        staffRestaurant: { connect: { id: rest.id } },
      },
    });
    const managerWithAnalytics = await prisma.user.create({
      data: {
        email: 'manager-analytics@example.com',
        role: 'STAFF',
        isActive: true,
        staffRestaurant: { connect: { id: rest.id } },
      },
    });

    const sessionNoAnalytics = await prisma.session.create({
      data: {
        userId: managerNoAnalytics.id,
        token: 'test-session-manager-no-analytics',
        expiresAt: new Date(Date.now() + 1000000),
      },
    });
    managerNoAnalyticsToken = sessionNoAnalytics.token;

    const sessionAnalytics = await prisma.session.create({
      data: {
        userId: managerWithAnalytics.id,
        token: 'test-session-manager-analytics',
        expiresAt: new Date(Date.now() + 1000000),
      },
    });
    managerWithAnalyticsToken = sessionAnalytics.token;

    // 4. Create roles
    await prisma.staffRole.create({
      data: {
        name: 'NoAnalytics',
        restaurantId: rest.id,
        permissions: ['orders:read'],
      },
    });
    await prisma.staffRole.create({
      data: {
        name: 'AnalyticsRole',
        restaurantId: rest.id,
        permissions: ['analytics:read'],
      },
    });

    // 5. Assign roles
    await prisma.user.update({
      where: { id: managerNoAnalytics.id },
      data: { customRole: 'NoAnalytics' },
    });
    await prisma.user.update({
      where: { id: managerWithAnalytics.id },
      data: { customRole: 'AnalyticsRole' },
    });
  });

  afterAll(async () => {
    await prisma.restaurant.deleteMany({
      where: { slug: 'analytics-rest' },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'owner-analytics-e2e@example.com',
            'manager-no-analytics@example.com',
            'manager-analytics@example.com',
          ],
        },
      },
    });
    await prisma.$disconnect();
    await app.close();
  });

  describe('GET /restaurants/:id/analytics', () => {
    it('should forbid access for manager without analytics:read', async () => {
      await request(app.getHttpServer())
        .get(`/restaurants/${restaurantId}/analytics`)
        .set('Cookie', [`gustio_session=${managerNoAnalyticsToken}`])
        .set('x-restaurant-id', String(restaurantId))
        .expect(403);
    });

    it('should allow access for owner', async () => {
      const res = await request(app.getHttpServer())
        .get(`/restaurants/${restaurantId}/analytics`)
        .set('Cookie', [`gustio_session=${ownerToken}`])
        .set('x-restaurant-id', String(restaurantId))
        .expect(200);

      expect(res.body).toHaveProperty('totalRevenue');
      expect(res.body).toHaveProperty('totalOrders');
      expect(res.body).toHaveProperty('averageCheck');
    });

    it('should allow access for manager with analytics:read', async () => {
      const res = await request(app.getHttpServer())
        .get(`/restaurants/${restaurantId}/analytics`)
        .set('Cookie', [`gustio_session=${managerWithAnalyticsToken}`])
        .set('x-restaurant-id', String(restaurantId))
        .expect(200);

      expect(res.body.chartData).toBeDefined();
    });

    it('should fail with 400 when invalid date is provided', async () => {
      const res = await request(app.getHttpServer())
        .get(`/restaurants/${restaurantId}/analytics?startDate=invalid-date`)
        .set('Cookie', [`gustio_session=${ownerToken}`])
        .set('x-restaurant-id', String(restaurantId))
        .expect(400);

      expect(res.body.message).toContain('errors.invalid_start_date');
    });

    it('should process valid dates correctly', async () => {
      await request(app.getHttpServer())
        .get(
          `/restaurants/${restaurantId}/analytics?startDate=2023-01-01&endDate=2023-01-31`,
        )
        .set('Cookie', [`gustio_session=${ownerToken}`])
        .set('x-restaurant-id', String(restaurantId))
        .expect(200);
    });
  });
});
