import { describe, beforeAll, afterAll, it, expect } from '@jest/globals';
import type { TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/prisma/prisma.service';

describe('MenuModule (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let restaurantId: number;
  let ownerToken: string;
  let staffWithPermissionToken: string;
  let staffNoPermissionToken: string;

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

    // Initial Cleanup
    await prisma.session.deleteMany({
      where: {
        token: {
          in: [
            'owner-session-menu',
            'staff-yes-session-menu',
            'staff-no-session-menu',
          ],
        },
      },
    });
    await prisma.staffRole.deleteMany({
      where: { restaurant: { owner: { email: 'owner-menu-e2e@example.com' } } },
    });
    await prisma.restaurant.deleteMany({
      where: { owner: { email: 'owner-menu-e2e@example.com' } },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'owner-menu-e2e@example.com',
            'staff-menu-yes@example.com',
            'staff-menu-no@example.com',
          ],
        },
      },
    });

    // Create Owner User
    const owner = await prisma.user.create({
      data: {
        email: 'owner-menu-e2e@example.com',
        role: 'OWNER',
        isActive: true,
      },
    });

    // Create Restaurant
    const restaurant = await prisma.restaurant.create({
      data: {
        title: 'Test Menu Restaurant',
        slug: 'test-menu-rest',
        type: 'CAFE',
        currency: 'USD',
        language: 'UA',
        ownerId: owner.id,
      },
    });
    restaurantId = restaurant.id;

    // Create roles
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _roleWithPermissions = await prisma.staffRole.create({
      data: {
        name: 'Menu Manager',
        restaurantId: restaurant.id,
        permissions: [
          'menu:manage',
          'menu:read',
          'menu:create',
          'menu:update',
          'menu:delete',
        ],
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
    const staffWithPermission = await prisma.user.create({
      data: {
        email: 'staff-menu-yes@example.com',
        role: 'STAFF',
        isActive: true,
        customRole: 'Menu Manager',
        staffRestaurant: { connect: { id: restaurant.id } },
      },
    });

    const staffNoPermission = await prisma.user.create({
      data: {
        email: 'staff-menu-no@example.com',
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
        token: 'owner-session-menu',
        expiresAt: new Date(Date.now() + 1000000),
      },
    });
    ownerToken = ownerSession.token;

    const staffYesSession = await prisma.session.create({
      data: {
        userId: staffWithPermission.id,
        token: 'staff-yes-session-menu',
        expiresAt: new Date(Date.now() + 1000000),
      },
    });
    staffWithPermissionToken = staffYesSession.token;

    const staffNoSession = await prisma.session.create({
      data: {
        userId: staffNoPermission.id,
        token: 'staff-no-session-menu',
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
          restaurant: { owner: { email: 'owner-menu-e2e@example.com' } },
        },
      });
      await prisma.restaurant.deleteMany({ where: { id: restaurantId } });
      await prisma.user.deleteMany({
        where: {
          email: {
            in: [
              'owner-menu-e2e@example.com',
              'staff-menu-yes@example.com',
              'staff-menu-no@example.com',
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

  describe('Public Menu', () => {
    it('GET /restaurants/:restaurantId/menu - should return menu', async () => {
      const response = await request(app.getHttpServer())
        .get(`/menu/${restaurantId}`)
        .expect(200);

      expect(response.body).toHaveProperty('restaurantId', restaurantId);
      expect(response.body).toHaveProperty('categories');
    });

    it('GET /restaurants/:restaurantId/menu - should return 404 for invalid ID', async () => {
      const response = await request(app.getHttpServer())
        .get('/menu/999999')
        .expect(404);

      expect(response.body.message).toBe('errors.restaurant_not_found');
    });
  });

  describe('Owner Menu Management', () => {
    let categoryId: string;

    it('POST /menu/owner/categories - should reject unauthorized', async () => {
      await request(app.getHttpServer())
        .post('/menu/owner/categories')
        .set('x-restaurant-id', String(restaurantId))
        .send({ name: 'Pizza' })
        .expect(401);
    });

    it('POST /menu/owner/categories - should reject if staff has no permission', async () => {
      await request(app.getHttpServer())
        .post('/menu/owner/categories')
        .set('Cookie', [`gustio_session=${staffNoPermissionToken}`])
        .set('x-restaurant-id', String(restaurantId))
        .send({ name: 'Pizza' })
        .expect(403);
    });

    it('POST /menu/owner/categories - should create category as owner', async () => {
      const response = await request(app.getHttpServer())
        .post('/menu/owner/categories')
        .set('Cookie', [`gustio_session=${ownerToken}`])
        .set('x-restaurant-id', String(restaurantId))
        .send({ name: 'Pizza', sortOrder: 1 })
        .expect(201);

      expect(response.body.message).toBe('success.category_created');
      expect(response.body.category).toHaveProperty('id');
      expect(response.body.category.name).toBe('Pizza');

      categoryId = response.body.category.id;
    });

    it('POST /menu/owner/categories - should create category as staff with permission', async () => {
      const response = await request(app.getHttpServer())
        .post('/menu/owner/categories')
        .set('Cookie', [`gustio_session=${staffWithPermissionToken}`])
        .set('x-restaurant-id', String(restaurantId))
        .send({ name: 'Burgers', sortOrder: 2 })
        .expect(201);

      expect(response.body.message).toBe('success.category_created');
      expect(response.body.category.name).toBe('Burgers');
    });

    it('POST /menu/owner/categories/:categoryId/dishes - should create dish as owner', async () => {
      const response = await request(app.getHttpServer())
        .post(`/menu/owner/categories/${categoryId}/dishes`)
        .set('Cookie', [`gustio_session=${ownerToken}`])
        .set('x-restaurant-id', String(restaurantId))
        .send({
          name: 'Margarita',
          price: 150,
          isAvailable: true,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Margarita');
    });

    it('DELETE /menu/owner/categories/:categoryId - should reject if staff has no permission', async () => {
      await request(app.getHttpServer())
        .delete(`/menu/owner/categories/${categoryId}`)
        .set('Cookie', [`gustio_session=${staffNoPermissionToken}`])
        .set('x-restaurant-id', String(restaurantId))
        .expect(403);
    });

    it('DELETE /menu/owner/categories/:categoryId - should delete category as staff with permission', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/menu/owner/categories/${categoryId}`)
        .set('Cookie', [`gustio_session=${staffWithPermissionToken}`])
        .set('x-restaurant-id', String(restaurantId))
        .expect(200);

      expect(response.body.message).toBe('success.category_deleted');
    });
  });
});
