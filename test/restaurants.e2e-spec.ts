import { describe, beforeAll, afterAll, it, expect } from '@jest/globals';
import type { TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/prisma/prisma.service';

describe('RestaurantsModule (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerToken: string;
  let restaurantId: number;

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

    const user = await prisma.user.create({
      data: {
        email: 'e2e-owner-rest@example.com',
        role: 'OWNER',
        isActive: true,
      },
    });

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        token: 'test-session-token-rest',
        expiresAt: new Date(Date.now() + 1000000),
      },
    });
    ownerToken = session.token;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.restaurant.deleteMany({ where: { slug: 'e2e-rest' } });
      await prisma.user.deleteMany({
        where: { email: 'e2e-owner-rest@example.com' },
      });
      await prisma.$disconnect();
    }
    if (app) {
      await app.close();
    }
  });

  it('POST /restaurants - should create restaurant', async () => {
    const response = await request(app.getHttpServer())
      .post('/restaurants')
      .set('Cookie', [`gustio_session=${ownerToken}`])
      .send({
        title: 'E2E Restaurant',
        slug: 'e2e-rest',
        type: 'CAFE',
        currency: 'USD',
        language: 'UA',
      })
      .expect(201);

    expect(response.body.message).toBe('success.restaurant_created');
    expect(response.body.restaurant).toHaveProperty('id');
    restaurantId = response.body.restaurant.id;
  });

  it('POST /restaurants - should reject short title', async () => {
    await request(app.getHttpServer())
      .post('/restaurants')
      .set('Cookie', [`gustio_session=${ownerToken}`])
      .send({
        title: 'AB', // too short
        slug: 'valid-slug',
        type: 'CAFE',
        currency: 'USD',
        language: 'UA',
      })
      .expect(400);
  });

  it('POST /restaurants - should reject invalid slug format', async () => {
    await request(app.getHttpServer())
      .post('/restaurants')
      .set('Cookie', [`gustio_session=${ownerToken}`])
      .send({
        title: 'Valid Title',
        slug: 'Invalid Slug!', // uppercase and special chars
        type: 'CAFE',
        currency: 'USD',
        language: 'UA',
      })
      .expect(400);
  });

  it('POST /restaurants/check-restaurant-slug - should return availability', async () => {
    const response = await request(app.getHttpServer())
      .post('/restaurants/check-restaurant-slug')
      .send({ slug: 'e2e-rest' })
      .expect(200);

    expect(response.body.isAvailable).toBe(false);
  });

  it('DELETE /restaurants/:id - should delete restaurant', async () => {
    const response = await request(app.getHttpServer())
      .delete(`/restaurants/${restaurantId}`)
      .set('Cookie', [`gustio_session=${ownerToken}`])
      .set('x-restaurant-id', String(restaurantId))
      .expect(200);

    expect(response.body.message).toBe('success.restaurant_deleted');
  });
});
