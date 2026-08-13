import { describe, beforeAll, afterAll, it, expect } from '@jest/globals';
import type { TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { WaiterCallType } from 'src/live-calls/dto/trigger-call.dto';

describe('LiveCallsModule (e2e)', () => {
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

    // Initial cleanup in case of previous test failures
    await prisma.diningTable.deleteMany({
      where: {
        restaurant: { owner: { email: 'owner-live-calls-e2e@example.com' } },
      },
    });
    await prisma.session.deleteMany({
      where: {
        token: {
          in: [
            'test-session-owner-live-calls',
            'test-session-no-perm',
            'test-session-perm',
          ],
        },
      },
    });
    await prisma.staffRole.deleteMany({
      where: { name: 'LiveRole' },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'owner-live-calls-e2e@example.com',
            'staff-no-perm@example.com',
            'staff-perm@example.com',
          ],
        },
      },
    });
    await prisma.restaurant.deleteMany({
      where: { owner: { email: 'owner-live-calls-e2e@example.com' } },
    });

    // 1. Create Owner User
    const owner = await prisma.user.create({
      data: {
        email: 'owner-live-calls-e2e@example.com',
        role: 'OWNER',
        isActive: true,
      },
    });

    const ownerSession = await prisma.session.create({
      data: {
        userId: owner.id,
        token: 'test-session-owner-live-calls',
        expiresAt: new Date(Date.now() + 1000000),
      },
    });
    ownerToken = ownerSession.token;

    // 2. Create Restaurants
    const rest = await prisma.restaurant.create({
      data: {
        title: 'LiveCalls Restaurant',
        slug: 'livecalls-rest',
        type: 'CAFE',
        currency: 'USD',
        language: 'UA',
        ownerId: owner.id,
        activeModules: ['live-calls'],
      },
    });
    restaurantId = rest.id;

    const anotherRest = await prisma.restaurant.create({
      data: {
        title: 'Another Restaurant',
        slug: 'another-rest',
        type: 'CAFE',
        currency: 'USD',
        language: 'UA',
        ownerId: owner.id,
        activeModules: ['live-calls'],
      },
    });
    anotherRestaurantId = anotherRest.id;

    // 3. Create Managers
    const staffNoPermission = await prisma.user.create({
      data: {
        email: 'staff-no-perm@example.com',
        role: 'STAFF',
        isActive: true,
        staffRestaurant: { connect: { id: rest.id } },
      },
    });

    // Create a StaffRole with permissions
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _liveRole = await prisma.staffRole.create({
      data: {
        name: 'LiveRole',
        restaurantId: rest.id,
        permissions: ['live-calls:read', 'live-calls:resolve'],
      },
    });

    const staffWithPermission = await prisma.user.create({
      data: {
        email: 'staff-perm@example.com',
        role: 'STAFF',
        customRole: 'LiveRole',
        isActive: true,
        staffRestaurant: { connect: { id: rest.id } },
      },
    });

    const sessionNoPerm = await prisma.session.create({
      data: {
        userId: staffNoPermission.id,
        token: 'test-session-no-perm',
        expiresAt: new Date(Date.now() + 1000000),
      },
    });
    staffNoPermissionToken = sessionNoPerm.token;

    const sessionPerm = await prisma.session.create({
      data: {
        userId: staffWithPermission.id,
        token: 'test-session-perm',
        expiresAt: new Date(Date.now() + 1000000),
      },
    });
    staffWithPermissionToken = sessionPerm.token;

    // 4. Create Tables
    const table = await prisma.diningTable.create({
      data: {
        number: 1,
        restaurantId,
        type: 'SQUARE',
        isWaiterCallActive: true,
        waiterCallType: WaiterCallType.WAITER,
        waiterCallRequestedAt: new Date(),
      },
    });
    tableId = table.id;

    const anotherTable = await prisma.diningTable.create({
      data: {
        number: 1,
        type: 'SQUARE',
        restaurantId: anotherRestaurantId,
        isWaiterCallActive: true,
      },
    });
    anotherTableId = anotherTable.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.diningTable.deleteMany({
      where: { id: { in: [tableId, anotherTableId] } },
    });
    await prisma.session.deleteMany({
      where: {
        token: {
          in: [ownerToken, staffNoPermissionToken, staffWithPermissionToken],
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'owner-live-calls-e2e@example.com',
            'staff-no-perm@example.com',
            'staff-perm@example.com',
          ],
        },
      },
    });
    await prisma.staffRole.deleteMany({
      where: { name: 'LiveRole' },
    });
    await prisma.restaurant.deleteMany({
      where: { id: { in: [restaurantId, anotherRestaurantId] } },
    });
    await app.close();
  });

  describe('GET /restaurants/:id/live-calls', () => {
    it('should return active calls for owner', async () => {
      const res = await request(app.getHttpServer())
        .get(`/restaurants/${restaurantId}/live-calls`)
        .set('Cookie', [`gustio_session=${ownerToken}`])
        .expect(200);

      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBe(1);
      expect(res.body[0].tableId).toBe(tableId);
      expect(res.body[0].type).toBe(WaiterCallType.WAITER);
    });

    it('should return active calls for staff with LIVE_READ permission', async () => {
      const res = await request(app.getHttpServer())
        .get(`/restaurants/${restaurantId}/live-calls`)
        .set('Cookie', [`gustio_session=${staffWithPermissionToken}`])
        .expect(200);

      expect(res.body.length).toBe(1);
    });

    it('should return 403 for staff without LIVE_READ permission', async () => {
      await request(app.getHttpServer())
        .get(`/restaurants/${restaurantId}/live-calls`)
        .set('Cookie', [`gustio_session=${staffNoPermissionToken}`])
        .expect(403);
    });
  });

  describe('DELETE /restaurants/:id/live-calls/:callId', () => {
    it('should return 403 for staff without LIVE_RESOLVE permission', async () => {
      await request(app.getHttpServer())
        .delete(`/restaurants/${restaurantId}/live-calls/${tableId}`)
        .set('Cookie', [`gustio_session=${staffNoPermissionToken}`])
        .expect(403);
    });

    it('should return 404 if table belongs to another restaurant', async () => {
      await request(app.getHttpServer())
        .delete(`/restaurants/${restaurantId}/live-calls/${anotherTableId}`)
        .set('Cookie', [`gustio_session=${ownerToken}`])
        .expect(404);
    });

    it('should dismiss a call for owner', async () => {
      await request(app.getHttpServer())
        .delete(`/restaurants/${restaurantId}/live-calls/${tableId}`)
        .set('Cookie', [`gustio_session=${ownerToken}`])
        .expect(200);

      const table = await prisma.diningTable.findUnique({
        where: { id: tableId },
      });
      expect(table?.isWaiterCallActive).toBe(false);
      expect(table?.waiterCallRequestedAt).toBeNull();
    });

    // Make table active again for next tests
    it('reset table state', async () => {
      await prisma.diningTable.update({
        where: { id: tableId },
        data: {
          isWaiterCallActive: true,
          waiterCallType: WaiterCallType.WAITER,
          waiterCallRequestedAt: new Date(),
        },
      });
    });

    it('should dismiss a call for staff with LIVE_RESOLVE permission', async () => {
      await request(app.getHttpServer())
        .delete(`/restaurants/${restaurantId}/live-calls/${tableId}`)
        .set('Cookie', [`gustio_session=${staffWithPermissionToken}`])
        .expect(200);
    });
  });

  describe('POST /restaurants/:id/live-calls/public/trigger', () => {
    it('should create a new call (public)', async () => {
      // First resolve the existing call if it is active
      await prisma.diningTable.update({
        where: { id: tableId },
        data: { isWaiterCallActive: false },
      });

      const res = await request(app.getHttpServer())
        .post(`/restaurants/${restaurantId}/live-calls/public/trigger`)
        .send({ tableId, type: WaiterCallType.BILL })
        .expect(201);

      expect(res.body.message).toBe('responses.waiter_call_created');

      const table = await prisma.diningTable.findUnique({
        where: { id: tableId },
      });
      expect(table?.isWaiterCallActive).toBe(true);
      expect(table?.waiterCallType).toBe(WaiterCallType.BILL);
      expect(table?.waiterCallRequestedAt).not.toBeNull();
    });

    it('should return 201 if call is active but type is different', async () => {
      // It's already active with BILL from previous step, changing to WAITER
      await request(app.getHttpServer())
        .post(`/restaurants/${restaurantId}/live-calls/public/trigger`)
        .send({ tableId, type: WaiterCallType.WAITER })
        .expect(201);
    });

    it('should return 400 if call is already active with the same type', async () => {
      // Now it's WAITER, sending WAITER again should fail
      await request(app.getHttpServer())
        .post(`/restaurants/${restaurantId}/live-calls/public/trigger`)
        .send({ tableId, type: WaiterCallType.WAITER })
        .expect(400);
    });

    it('should return 400 for invalid type', async () => {
      await request(app.getHttpServer())
        .post(`/restaurants/${restaurantId}/live-calls/public/trigger`)
        .send({ tableId, type: 'INVALID_TYPE' })
        .expect(400);
    });

    it('should return 404 for invalid tableId', async () => {
      const fakeUuid = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .post(`/restaurants/${restaurantId}/live-calls/public/trigger`)
        .send({ tableId: fakeUuid, type: WaiterCallType.WAITER })
        .expect(404);
    });
  });
});
