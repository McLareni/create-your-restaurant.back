import { describe, beforeAll, afterAll, it, expect } from '@jest/globals';
import type { TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { hash } from 'bcrypt';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/prisma/prisma.service';

describe('UsersModule (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testToken: string;

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
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.user.deleteMany({
        where: { email: 'e2e-user@example.com' },
      });
      await prisma.$disconnect();
    }
    if (app) {
      await app.close();
    }
  });

  it('POST /users - should request login code', async () => {
    const response = await request(app.getHttpServer())
      .post('/users')
      .send({ email: 'e2e-user@example.com' })
      .expect(201);

    expect(response.body.message).toBe('auth.code_sent');
  });

  it('POST /users/verify-login-code - should verify code and set cookie', async () => {
    const user = await prisma.user.findFirst({
      where: { email: 'e2e-user@example.com' },
    });

    const knownHash = await hash('123456', 12);

    await prisma.user.update({
      where: { id: Number(user?.id) },
      data: {
        loginCodeHash: knownHash,
        loginCodeExpiresAt: new Date(Date.now() + 100000),
      },
    });

    const response = await request(app.getHttpServer())
      .post('/users/verify-login-code')
      .send({ email: 'e2e-user@example.com', code: '123456' })
      .expect(201);

    expect(response.body.message).toBe('auth.login_success');
    expect(response.headers['set-cookie']).toBeDefined();

    const rawCookies = response.headers['set-cookie'];
    const cookies = Array.isArray(rawCookies)
      ? rawCookies
      : [String(rawCookies)];

    const sessionCookie = cookies.find((c) => c.startsWith('gustio_session='));
    expect(sessionCookie).toBeDefined();

    testToken = String(sessionCookie).split(';')[0].split('=')[1];
  });

  it('GET /users/me - should fail without cookie', async () => {
    await request(app.getHttpServer()).get('/users/me').expect(401);
  });

  it('GET /users/me - should return user with cookie', async () => {
    const response = await request(app.getHttpServer())
      .get('/users/me')
      .set('Cookie', [`gustio_session=${testToken}`])
      .expect(200);

    expect(response.body.user.email).toBe('e2e-user@example.com');
  });

  it('POST /users/logout - should logout', async () => {
    const response = await request(app.getHttpServer())
      .post('/users/logout')
      .set('Cookie', [`gustio_session=${testToken}`])
      .expect(200);

    expect(response.body.message).toBe('auth.logout_success');
  });
});
