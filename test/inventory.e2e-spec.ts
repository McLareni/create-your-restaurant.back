import { describe, beforeAll, afterAll, it, expect } from '@jest/globals';
import type { TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/prisma/prisma.service';

describe('InventoryModule (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let restaurantId: number;
  let ownerToken: string;

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
        email: 'test-owner-inventory@example.com',
        role: 'OWNER',
        isActive: true,
      },
    });

    const restaurant = await prisma.restaurant.create({
      data: {
        title: 'Test Inventory Restaurant',
        slug: 'test-inv-rest',
        type: 'CAFE',
        currency: 'USD',
        language: 'UA',
        ownerId: user.id,
        activeModules: ['menu-engine', 'qr-tables', 'staff', 'inventory'],
      },
    });

    restaurantId = restaurant.id;

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        token: 'test-session-token-inventory',
        expiresAt: new Date(Date.now() + 1000000),
      },
    });

    ownerToken = session.token;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.restaurant.deleteMany({
        where: { id: restaurantId },
      });
      await prisma.user.deleteMany({
        where: { email: 'test-owner-inventory@example.com' },
      });
      await prisma.$disconnect();
    }
    if (app) {
      await app.close();
    }
  });

  describe('Inventory Management', () => {
    let inventoryItemId: string;

    it('POST /inventory - should reject unauthorized', async () => {
      await request(app.getHttpServer())
        .post('/inventory')
        .set('x-restaurant-id', String(restaurantId))
        .send({ name: 'Tomato', stock: 10, unit: 'kg' })
        .expect(401);
    });

    it('POST /inventory - should create inventory item', async () => {
      const response = await request(app.getHttpServer())
        .post('/inventory')
        .set('Cookie', [`gustio_session=${ownerToken}`])
        .set('x-restaurant-id', String(restaurantId))
        .send({ name: 'Tomato', stock: 10, unit: 'kg' })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Tomato');
      expect(response.body.stock).toBe(10);
      expect(response.body.unit).toBe('kg');

      inventoryItemId = response.body.id;
    });

    it('POST /inventory - should prevent duplicate names', async () => {
      const response = await request(app.getHttpServer())
        .post('/inventory')
        .set('Cookie', [`gustio_session=${ownerToken}`])
        .set('x-restaurant-id', String(restaurantId))
        .send({ name: 'Tomato', stock: 5, unit: 'kg' })
        .expect(409);

      expect(response.body.message).toBe(
        'errors.inventory_item_already_exists',
      );
    });

    it('GET /inventory - should return list of items', async () => {
      const response = await request(app.getHttpServer())
        .get('/inventory')
        .set('Cookie', [`gustio_session=${ownerToken}`])
        .set('x-restaurant-id', String(restaurantId))
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].name).toBe('Tomato');
    });

    it('PATCH /inventory/:id - should update stock', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/inventory/${inventoryItemId}`)
        .set('Cookie', [`gustio_session=${ownerToken}`])
        .set('x-restaurant-id', String(restaurantId))
        .send({ stock: 15 })
        .expect(200);

      expect(response.body.stock).toBe(15);
    });

    it('DELETE /inventory/:id - should delete item', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/inventory/${inventoryItemId}`)
        .set('Cookie', [`gustio_session=${ownerToken}`])
        .set('x-restaurant-id', String(restaurantId))
        .expect(200);

      expect(response.body.message).toBe('success.inventory_item_deleted');
    });
  });
});
