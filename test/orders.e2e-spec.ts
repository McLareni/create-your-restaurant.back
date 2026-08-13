import { describe, beforeAll, afterAll, it, expect } from '@jest/globals';
import type { TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/prisma/prisma.service';

describe('OrdersModule (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let restaurantId: number;
  let ownerToken: string;
  let tableId: string;
  let dishId: string;
  let orderId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.init();

    prisma = app.get(PrismaService);

    const user = await prisma.user.create({
      data: {
        email: 'test-owner-orders@example.com',
        role: 'OWNER',
        isActive: true,
      },
    });

    const restaurant = await prisma.restaurant.create({
      data: {
        title: 'Test Orders Restaurant',
        slug: 'test-orders-rest',
        type: 'CAFE',
        currency: 'USD',
        language: 'UA',
        ownerId: user.id,
      },
    });

    restaurantId = restaurant.id;

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        token: 'test-session-token-orders',
        expiresAt: new Date(Date.now() + 1000000),
      },
    });

    ownerToken = session.token;

    const table = await prisma.diningTable.create({
      data: {
        restaurantId,
        number: 10,
        type: 'HALL',
        status: 'ACTIVE',
      },
    });
    tableId = table.id;

    const category = await prisma.category.create({
      data: {
        restaurantId,
        name: 'Main Course',
        sortOrder: 1,
      },
    });

    const dish = await prisma.dish.create({
      data: {
        categoryId: category.id,
        name: 'Steak',
        price: 300,
        isAvailable: true,
      },
    });
    dishId = dish.id;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.restaurant.deleteMany({
        where: { id: restaurantId },
      });
      await prisma.user.deleteMany({
        where: { email: 'test-owner-orders@example.com' },
      });
      await prisma.$disconnect();
    }
    if (app) {
      await app.close();
    }
  });

  describe('Public Ordering', () => {
    it('POST /restaurants/:restaurantId/orders/public - should create order', async () => {
      const response = await request(app.getHttpServer())
        .post(`/restaurants/${restaurantId}/orders/public`)
        .send({
          tableId,
          type: 'DINE_IN',
          items: [{ dishId, quantity: 2 }],
        })
        .expect(201);

      expect(response.body.message).toBe('success.order_created');
      expect(response.body.order).toHaveProperty('id');
      expect(response.body.order.totalAmount).toBe(600);

      orderId = response.body.order.id;
    });

    it('POST /restaurants/:restaurantId/orders/public/:orderId/items - should append items', async () => {
      const response = await request(app.getHttpServer())
        .post(`/restaurants/${restaurantId}/orders/public/${orderId}/items`)
        .send({
          items: [{ dishId, quantity: 1 }],
        })
        .expect(201);

      expect(response.body.message).toBe('success.items_appended');
      expect(response.body.order.totalAmount).toBe(900);
    });
  });

  describe('Owner Order Management', () => {
    it('GET /restaurants/:restaurantId/orders - should list orders', async () => {
      const response = await request(app.getHttpServer())
        .get(`/restaurants/${restaurantId}/orders`)
        .set('Cookie', [`gustio_session=${ownerToken}`])
        .set('x-restaurant-id', String(restaurantId))
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].id).toBe(orderId);
    });

    it('PATCH /restaurants/:restaurantId/orders/:orderId - should update order status', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/restaurants/${restaurantId}/orders/${orderId}`)
        .set('Cookie', [`gustio_session=${ownerToken}`])
        .set('x-restaurant-id', String(restaurantId))
        .send({ status: 'IN_PROGRESS' })
        .expect(200);

      expect(response.body.message).toBe('success.order_updated');
      expect(response.body.order.status).toBe('IN_PROGRESS');
    });

    it('DELETE /restaurants/:restaurantId/orders/:orderId - should delete order', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/restaurants/${restaurantId}/orders/${orderId}`)
        .set('Cookie', [`gustio_session=${ownerToken}`])
        .set('x-restaurant-id', String(restaurantId))
        .expect(200);

      expect(response.body.message).toBe('success.order_deleted');
    });
  });
});
