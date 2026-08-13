import { describe, beforeAll, afterAll, it, expect } from '@jest/globals';
import type { TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

describe('LiveMonitorModule (e2e)', () => {
  jest.setTimeout(30000);
  let app: INestApplication;
  let prisma: PrismaService;
  let restaurantId: number;
  let anotherRestaurantId: number;
  let ownerToken: string;
  let staffNoPermissionToken: string;
  let staffWithPermissionToken: string;
  let tableId: string;
  let anotherTableId: string;
  let activeOrderId: string;
  let completedOrderId: string;

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

    // Initial cleanup
    await prisma.orderItem.deleteMany({
      where: {
        order: {
          restaurant: {
            owner: { email: 'owner-live-monitor-e2e@example.com' },
          },
        },
      },
    });
    await prisma.order.deleteMany({
      where: {
        restaurant: { owner: { email: 'owner-live-monitor-e2e@example.com' } },
      },
    });
    await prisma.diningTable.deleteMany({
      where: {
        restaurant: { owner: { email: 'owner-live-monitor-e2e@example.com' } },
      },
    });
    await prisma.session.deleteMany({
      where: {
        token: {
          in: [
            'test-session-owner-live-monitor',
            'test-session-no-perm-lm',
            'test-session-perm-lm',
          ],
        },
      },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: '-live-monitor-e2e@example.com' } },
    });
    await prisma.staffRole.deleteMany({
      where: {
        restaurant: { owner: { email: 'owner-live-monitor-e2e@example.com' } },
      },
    });
    await prisma.restaurant.deleteMany({
      where: { owner: { email: 'owner-live-monitor-e2e@example.com' } },
    });

    // Create Owner User
    const owner = await prisma.user.create({
      data: {
        email: 'owner-live-monitor-e2e@example.com',
        role: 'OWNER',
        isActive: true,
      },
    });

    const anotherOwner = await prisma.user.create({
      data: {
        email: 'another-owner-live-monitor-e2e@example.com',
        role: 'OWNER',
        isActive: true,
      },
    });

    // Create Restaurants
    const restaurant = await prisma.restaurant.create({
      data: {
        title: 'Live Monitor Test Restaurant',
        slug: 'live-monitor-test',
        type: 'CAFE',
        currency: 'USD',
        language: 'UA',
        ownerId: owner.id,
        activeModules: ['live-calls'],
      },
    });
    restaurantId = restaurant.id;

    const anotherRestaurant = await prisma.restaurant.create({
      data: {
        title: 'Another Restaurant',
        slug: 'another-live-monitor-test',
        type: 'CAFE',
        currency: 'USD',
        language: 'UA',
        ownerId: anotherOwner.id,
        activeModules: ['live-calls'],
      },
    });
    anotherRestaurantId = anotherRestaurant.id;

    // Create roles
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _roleWithPermissions = await prisma.staffRole.create({
      data: {
        name: 'Monitor Reader',
        restaurantId: restaurant.id,
        permissions: ['live-calls:read'],
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _roleWithoutPermissions = await prisma.staffRole.create({
      data: {
        name: 'No Perm',
        restaurantId: restaurant.id,
        permissions: [],
      },
    });

    // Create Staff Users
    const staffWithPerm = await prisma.user.create({
      data: {
        email: 'staff-perm-live-monitor-e2e@example.com',
        role: 'STAFF',
        isActive: true,
        customRole: 'Monitor Reader',
        staffRestaurant: { connect: { id: restaurant.id } },
      },
    });

    const staffNoPerm = await prisma.user.create({
      data: {
        email: 'staff-no-perm-live-monitor-e2e@example.com',
        role: 'STAFF',
        isActive: true,
        customRole: 'No Perm',
        staffRestaurant: { connect: { id: restaurant.id } },
      },
    });

    // Create sessions
    ownerToken = 'test-session-owner-live-monitor';
    await prisma.session.create({
      data: {
        token: ownerToken,
        userId: owner.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
    });

    staffWithPermissionToken = 'test-session-perm-lm';
    await prisma.session.create({
      data: {
        token: staffWithPermissionToken,
        userId: staffWithPerm.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
    });

    staffNoPermissionToken = 'test-session-no-perm-lm';
    await prisma.session.create({
      data: {
        token: staffNoPermissionToken,
        userId: staffNoPerm.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
    });

    // Create Tables
    const table = await prisma.diningTable.create({
      data: {
        number: 1,
        restaurantId: restaurant.id,
        isWaiterCallActive: true,
        type: 'SQUARE',
        status: 'ACTIVE',
      },
    });
    tableId = table.id;

    const anotherTable = await prisma.diningTable.create({
      data: {
        number: 1,
        restaurantId: anotherRestaurant.id,
        isWaiterCallActive: true,
        type: 'SQUARE',
        status: 'ACTIVE',
      },
    });
    anotherTableId = anotherTable.id;

    // Create Orders
    const activeOrder = await prisma.order.create({
      data: {
        orderNumber: 101,
        restaurantId: restaurant.id,
        tableId: table.id,
        status: OrderStatus.PENDING,
        totalAmount: 150,
        type: 'DINE_IN',
      },
    });
    activeOrderId = activeOrder.id;

    const completedOrder = await prisma.order.create({
      data: {
        orderNumber: 102,
        restaurantId: restaurant.id,
        tableId: table.id,
        status: OrderStatus.COMPLETED,
        totalAmount: 200,
        type: 'DINE_IN',
      },
    });
    completedOrderId = completedOrder.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.orderItem.deleteMany({
      where: {
        order: {
          restaurant: {
            owner: { email: 'owner-live-monitor-e2e@example.com' },
          },
        },
      },
    });
    await prisma.order.deleteMany({
      where: {
        restaurant: { owner: { email: 'owner-live-monitor-e2e@example.com' } },
      },
    });
    await prisma.diningTable.deleteMany({
      where: {
        restaurant: { owner: { email: 'owner-live-monitor-e2e@example.com' } },
      },
    });
    await prisma.session.deleteMany({
      where: {
        token: {
          in: [ownerToken, staffNoPermissionToken, staffWithPermissionToken],
        },
      },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: '-live-monitor-e2e@example.com' } },
    });
    await prisma.staffRole.deleteMany({
      where: {
        restaurant: { owner: { email: 'owner-live-monitor-e2e@example.com' } },
      },
    });
    await prisma.restaurant.deleteMany({
      where: { owner: { email: 'owner-live-monitor-e2e@example.com' } },
    });

    await prisma.diningTable.deleteMany({ where: { id: anotherTableId } });
    await prisma.restaurant.deleteMany({ where: { id: anotherRestaurantId } });
    await prisma.user.deleteMany({
      where: { email: 'another-owner-live-monitor-e2e@example.com' },
    });

    await app.close();
  });

  describe('GET /restaurants/:id/live-monitor/tables', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app.getHttpServer()).get(
        `/restaurants/${restaurantId}/live-monitor/tables`,
      );
      expect(response.status).toBe(401);
    });

    it('should return 403 if user has no permission', async () => {
      const response = await request(app.getHttpServer())
        .get(`/restaurants/${restaurantId}/live-monitor/tables`)
        .set('Cookie', [`gustio_session=${staffNoPermissionToken}`]);

      expect(response.status).toBe(403);
    });

    it('should return tables for owner', async () => {
      const response = await request(app.getHttpServer())
        .get(`/restaurants/${restaurantId}/live-monitor/tables`)
        .set('Cookie', [`gustio_session=${ownerToken}`]);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('tables');
      expect(Array.isArray(response.body.tables)).toBe(true);
      expect(response.body.tables.length).toBe(1);
      expect(response.body.tables[0].id).toBe(tableId);
      expect(response.body.tables[0].activeOrders).toBeDefined();
      expect(response.body.tables[0].activeOrders.length).toBe(1); // Only pending order
      expect(response.body.tables[0].activeOrders[0].id).toBe(activeOrderId);
    });

    it('should return tables for staff with permission', async () => {
      const response = await request(app.getHttpServer())
        .get(`/restaurants/${restaurantId}/live-monitor/tables`)
        .set('Cookie', [`gustio_session=${staffWithPermissionToken}`]);

      expect(response.status).toBe(200);
      expect(response.body.tables.length).toBe(1);
    });
  });

  describe('GET /restaurants/:id/live-monitor/tables/:tableId', () => {
    it('should return 403 if user has no permission', async () => {
      const response = await request(app.getHttpServer())
        .get(`/restaurants/${restaurantId}/live-monitor/tables/${tableId}`)
        .set('Cookie', [`gustio_session=${staffNoPermissionToken}`]);

      expect(response.status).toBe(403);
    });

    it('should return a single table snapshot', async () => {
      const response = await request(app.getHttpServer())
        .get(`/restaurants/${restaurantId}/live-monitor/tables/${tableId}`)
        .set('Cookie', [`gustio_session=${ownerToken}`]);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(tableId);
      expect(response.body.activeOrders.length).toBe(1);
      expect(response.body.activeOrders[0].id).toBe(activeOrderId);
    });
  });

  describe('GET /restaurants/:id/live-monitor/history', () => {
    it('should return 403 if user has no permission', async () => {
      const response = await request(app.getHttpServer())
        .get(`/restaurants/${restaurantId}/live-monitor/history`)
        .set('Cookie', [`gustio_session=${staffNoPermissionToken}`]);

      expect(response.status).toBe(403);
    });

    it('should return history snapshot with completed/canceled orders', async () => {
      const response = await request(app.getHttpServer())
        .get(`/restaurants/${restaurantId}/live-monitor/history`)
        .set('Cookie', [`gustio_session=${ownerToken}`]);

      expect(response.status).toBe(200);
      expect(response.body.orders).toBeDefined();
      expect(response.body.orders.length).toBe(1);
      expect(response.body.orders[0].id).toBe(completedOrderId); // Only completed order
    });
  });
});
