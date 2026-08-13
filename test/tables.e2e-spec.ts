import { describe, beforeAll, afterAll, it, expect } from '@jest/globals';
import type { TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/prisma/prisma.service';

describe('TablesModule (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let restaurantId: number;
  let ownerToken: string;
  let staffWithPermissionToken: string;
  let staffNoPermissionToken: string;
  let tableId: string;

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

    // Initial Cleanup
    await prisma.session.deleteMany({
      where: {
        token: {
          in: [
            'owner-session-tables',
            'staff-yes-session-tables',
            'staff-no-session-tables',
          ],
        },
      },
    });
    await prisma.staffRole.deleteMany({
      where: {
        restaurant: { owner: { email: 'owner-tables-e2e@example.com' } },
      },
    });
    await prisma.restaurant.deleteMany({
      where: { owner: { email: 'owner-tables-e2e@example.com' } },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'owner-tables-e2e@example.com',
            'staff-tables-yes@example.com',
            'staff-tables-no@example.com',
          ],
        },
      },
    });

    // Create Owner User
    const owner = await prisma.user.create({
      data: {
        email: 'owner-tables-e2e@example.com',
        role: 'OWNER',
        isActive: true,
      },
    });

    // Create Restaurant
    const restaurant = await prisma.restaurant.create({
      data: {
        title: 'Test Tables Rest',
        slug: 'test-tables-rest',
        type: 'CAFE',
        currency: 'USD',
        language: 'UA',
        ownerId: owner.id,
      },
    });
    restaurantId = restaurant.id;

    // Create roles
    await prisma.staffRole.create({
      data: {
        name: 'Tables Manager',
        restaurantId: restaurant.id,
        permissions: ['tables:manage', 'tables:read'],
      },
    });

    await prisma.staffRole.create({
      data: {
        name: 'No Perm',
        restaurantId: restaurant.id,
        permissions: [],
      },
    });

    // Create Staff Users
    const staffWithPermission = await prisma.user.create({
      data: {
        email: 'staff-tables-yes@example.com',
        role: 'STAFF',
        isActive: true,
        customRole: 'Tables Manager',
        staffRestaurant: { connect: { id: restaurant.id } },
      },
    });

    const staffNoPermission = await prisma.user.create({
      data: {
        email: 'staff-tables-no@example.com',
        role: 'STAFF',
        isActive: true,
        customRole: 'No Perm',
        staffRestaurant: { connect: { id: restaurant.id } },
      },
    });

    // Create Sessions
    const ownerSession = await prisma.session.create({
      data: {
        userId: owner.id,
        token: 'owner-session-tables',
        expiresAt: new Date(Date.now() + 1000000),
      },
    });
    ownerToken = ownerSession.token;

    const staffYesSession = await prisma.session.create({
      data: {
        userId: staffWithPermission.id,
        token: 'staff-yes-session-tables',
        expiresAt: new Date(Date.now() + 1000000),
      },
    });
    staffWithPermissionToken = staffYesSession.token;

    const staffNoSession = await prisma.session.create({
      data: {
        userId: staffNoPermission.id,
        token: 'staff-no-session-tables',
        expiresAt: new Date(Date.now() + 1000000),
      },
    });
    staffNoPermissionToken = staffNoSession.token;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.session.deleteMany({
        where: {
          token: {
            in: [
              ownerToken,
              staffWithPermissionToken,
              staffNoPermissionToken,
            ].filter(Boolean),
          },
        },
      });
      await prisma.staffRole.deleteMany({
        where: {
          restaurant: { owner: { email: 'owner-tables-e2e@example.com' } },
        },
      });
      await prisma.restaurant.deleteMany({ where: { id: restaurantId } });
      await prisma.user.deleteMany({
        where: {
          email: {
            in: [
              'owner-tables-e2e@example.com',
              'staff-tables-yes@example.com',
              'staff-tables-no@example.com',
            ],
          },
        },
      });
      await prisma.$disconnect();
    }
    if (app) {
      await app.close();
    }
  });

  describe('POST /restaurants/:restaurantId/dining-table', () => {
    it('should return 401 if not authenticated', async () => {
      await request(app.getHttpServer())
        .post(`/restaurants/${restaurantId}/dining-table`)
        .set('x-restaurant-id', String(restaurantId))
        .send({ number: 5, type: 'TERRACE', status: 'ACTIVE' })
        .expect(401);
    });

    it('should return 403 if staff has no permission', async () => {
      await request(app.getHttpServer())
        .post(`/restaurants/${restaurantId}/dining-table`)
        .set('Cookie', [`gustio_session=${staffNoPermissionToken}`])
        .set('x-restaurant-id', String(restaurantId))
        .send({ number: 5, type: 'TERRACE', status: 'ACTIVE' })
        .expect(403);
    });

    it('should create table as owner', async () => {
      const response = await request(app.getHttpServer())
        .post(`/restaurants/${restaurantId}/dining-table`)
        .set('Cookie', [`gustio_session=${ownerToken}`])
        .set('x-restaurant-id', String(restaurantId))
        .send({ number: 5, type: 'TERRACE', status: 'ACTIVE' })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      tableId = response.body.id;
    });

    it('should create table as staff with permission', async () => {
      const response = await request(app.getHttpServer())
        .post(`/restaurants/${restaurantId}/dining-table`)
        .set('Cookie', [`gustio_session=${staffWithPermissionToken}`])
        .set('x-restaurant-id', String(restaurantId))
        .send({ number: 6, type: 'TERRACE', status: 'ACTIVE' })
        .expect(201);

      expect(response.body).toHaveProperty('id');
    });
  });

  describe('GET /restaurants/:restaurantId/dining-table', () => {
    it('should return 401 if not authenticated', async () => {
      await request(app.getHttpServer())
        .get(`/restaurants/${restaurantId}/dining-table`)
        .set('x-restaurant-id', String(restaurantId))
        .expect(401);
    });

    it('should return 403 if staff has no permission', async () => {
      await request(app.getHttpServer())
        .get(`/restaurants/${restaurantId}/dining-table`)
        .set('Cookie', [`gustio_session=${staffNoPermissionToken}`])
        .set('x-restaurant-id', String(restaurantId))
        .expect(403);
    });

    it('should return tables list', async () => {
      const response = await request(app.getHttpServer())
        .get(`/restaurants/${restaurantId}/dining-table`)
        .set('Cookie', [`gustio_session=${ownerToken}`])
        .set('x-restaurant-id', String(restaurantId))
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('GET /restaurants/:restaurantId/dining-table/:tableId/exists', () => {
    it('should check table exists without authentication', async () => {
      const response = await request(app.getHttpServer())
        .get(`/restaurants/${restaurantId}/dining-table/${tableId}/exists`)
        .expect(200);

      expect(response.body.exists).toBe(true);
    });
  });

  describe('DELETE /restaurants/:restaurantId/dining-table/:tableId', () => {
    it('should return 403 if staff has no permission', async () => {
      await request(app.getHttpServer())
        .delete(`/restaurants/${restaurantId}/dining-table/${tableId}`)
        .set('Cookie', [`gustio_session=${staffNoPermissionToken}`])
        .set('x-restaurant-id', String(restaurantId))
        .expect(403);
    });

    it('should delete table as staff with permission', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/restaurants/${restaurantId}/dining-table/${tableId}`)
        .set('Cookie', [`gustio_session=${staffWithPermissionToken}`])
        .set('x-restaurant-id', String(restaurantId))
        .expect(200);

      expect(response.body.message).toBe(
        'responses.table_deleted_successfully',
      );
    });
  });
});