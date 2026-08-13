import { describe, beforeAll, afterAll, it, expect } from '@jest/globals';
import type { TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/prisma/prisma.service';

describe('StaffModule (e2e)', () => {
  jest.setTimeout(30000);
  let app: INestApplication;
  let prisma: PrismaService;
  let restaurantAId: number;
  let restaurantBId: number;
  let ownerToken: string;
  let managerToken: string;

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
        email: 'owner-staff-e2e@example.com',
        role: 'OWNER',
        isActive: true,
      },
    });

    const ownerSession = await prisma.session.create({
      data: {
        userId: owner.id,
        token: 'test-session-owner-staff',
        expiresAt: new Date(Date.now() + 1000000),
      },
    });
    ownerToken = ownerSession.token;

    // 2. Create Restaurants A and B owned by Owner
    const restA = await prisma.restaurant.create({
      data: {
        title: 'Restaurant A',
        slug: 'rest-a',
        type: 'CAFE',
        currency: 'USD',
        language: 'UA',
        ownerId: owner.id,
        activeModules: ['menu-engine', 'qr-tables', 'staff', 'orders'],
      },
    });
    restaurantAId = restA.id;

    const restB = await prisma.restaurant.create({
      data: {
        title: 'Restaurant B',
        slug: 'rest-b',
        type: 'CAFE',
        currency: 'USD',
        language: 'UA',
        ownerId: owner.id,
        activeModules: ['menu-engine', 'qr-tables', 'staff', 'orders'],
      },
    });
    restaurantBId = restB.id;

    // 3. Create Manager User for Restaurant A
    const managerA = await prisma.user.create({
      data: {
        email: 'manager-multi@example.com',
        role: 'STAFF',
        restaurantId: restA.id,
        isActive: true,
      },
    });

    const managerSession = await prisma.session.create({
      data: {
        userId: managerA.id,
        token: 'test-session-manager-staff',
        expiresAt: new Date(Date.now() + 1000000),
      },
    });
    managerToken = managerSession.token;

    // 4. Create Manager User for Restaurant B with the SAME EMAIL
    await prisma.user.create({
      data: {
        email: 'manager-multi@example.com', // SAME EMAIL!
        role: 'STAFF',
        restaurantId: restB.id,
        isActive: true,
      },
    });

    // 5. Create a Role in Restaurant A for Manager
    await prisma.staffRole.create({
      data: {
        name: 'SuperAdmin',
        restaurantId: restA.id,
        permissions: ['staff:roles', 'staff:update', 'staff:delete'],
      },
    });

    // Assign role to manager in Rest A
    await prisma.user.update({
      where: { id: managerA.id },
      data: { customRole: 'SuperAdmin' },
    });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.user.deleteMany({
        where: {
          email: {
            in: ['owner-staff-e2e@example.com', 'manager-multi@example.com'],
          },
        },
      });
      await prisma.restaurant.deleteMany({
        where: { slug: { in: ['rest-a', 'rest-b'] } },
      });
      await prisma.$disconnect();
    }
    if (app) {
      await app.close();
    }
  });

  describe('Multi-Account Login logic', () => {
    it('GET /users/me - Manager should see both restaurants', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/me')
        .set('Cookie', [`gustio_session=${managerToken}`])
        .expect(200);

      expect(response.body.user.email).toBe('manager-multi@example.com');
      expect(response.body.user.restaurants).toHaveLength(2);
      const slugs = response.body.user.restaurants.map((r: any) => r.slug);
      expect(slugs).toContain('rest-a');
      expect(slugs).toContain('rest-b');
    });
  });

  describe('Staff Roles Management', () => {
    it('POST /staff/roles - Owner should create a role successfully', async () => {
      const response = await request(app.getHttpServer())
        .post(`/restaurants/${restaurantAId}/staff/roles`)
        .set('Cookie', [`gustio_session=${ownerToken}`])
        .set('x-restaurant-id', String(restaurantAId))
        .send({
          name: 'Waiter',
          permissions: ['orders:read'],
        })
        .expect(201);

      expect(response.body.name).toBe('Waiter');
    });

    it('POST /staff/roles - Manager with staff:roles should create role', async () => {
      // Manager A has SuperAdmin role with staff:roles in Restaurant A
      const response = await request(app.getHttpServer())
        .post(`/restaurants/${restaurantAId}/staff/roles`)
        .set('Cookie', [`gustio_session=${managerToken}`])
        .set('x-restaurant-id', String(restaurantAId))
        .send({
          name: 'Hostess',
          permissions: ['orders:read'],
        })
        .expect(201);

      expect(response.body.name).toBe('Hostess');
    });

    it('POST /staff/roles - Manager without staff:roles should be forbidden', async () => {
      // Manager B (in Restaurant B) has no roles assigned!
      await request(app.getHttpServer())
        .post(`/restaurants/${restaurantBId}/staff/roles`)
        .set('Cookie', [`gustio_session=${managerToken}`])
        .set('x-restaurant-id', String(restaurantBId)) // Switch context to Rest B
        .send({
          name: 'Cook',
          permissions: ['orders:read'],
        })
        .expect(403);
    });
  });

  describe('Staff Management', () => {
    let newStaffId: string;

    it('POST /staff - Owner should create staff', async () => {
      const response = await request(app.getHttpServer())
        .post(`/restaurants/${restaurantAId}/staff`)
        .set('Cookie', [`gustio_session=${ownerToken}`])
        .set('x-restaurant-id', String(restaurantAId))
        .send({
          email: 'new-waiter@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'Waiter',
        })
        .expect(201);

      expect(response.body.staff.email).toBe('new-waiter@example.com');
      newStaffId = response.body.staff.id;
    });

    it('PATCH /staff/:id - Manager with staff:roles can update role', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/restaurants/${restaurantAId}/staff/${newStaffId}`)
        .set('Cookie', [`gustio_session=${managerToken}`]) // SuperAdmin in Rest A
        .set('x-restaurant-id', String(restaurantAId))
        .send({
          role: 'Hostess',
        })
        .expect(200);

      expect(response.body.staff.role).toBe('Hostess');
    });

    it('DELETE /staff/:id - should prevent self deletion', async () => {
      const managerRow = await prisma.user.findFirst({
        where: {
          email: 'manager-multi@example.com',
          restaurantId: restaurantAId,
        },
      });
      await request(app.getHttpServer())
        .delete(`/restaurants/${restaurantAId}/staff/${managerRow?.id}`)
        .set('Cookie', [`gustio_session=${managerToken}`])
        .set('x-restaurant-id', String(restaurantAId))
        .expect(400); // Bad Request (cannot delete self)
    });
  });
});
