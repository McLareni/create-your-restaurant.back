import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
jest.mock('./../src/users/users.service', () => ({
  UsersService: class UsersService {},
}));

import { UsersService } from './../src/users/users.service';
import { UsersController } from './../src/users/users.controller';

describe('UsersController (e2e)', () => {
  let app: INestApplication<App>;
  const usersServiceMock = {
    requestLoginCode: jest.fn(),
    verifyLoginCode: jest.fn(),
    logout: jest.fn(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: usersServiceMock,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  it('/users (POST) should request login code', async () => {
    usersServiceMock.requestLoginCode.mockResolvedValue({
      message: 'Code sent to email',
    });

    await request(app.getHttpServer())
      .post('/users')
      .send({ email: 'user@example.com' })
      .expect(201)
      .expect({ message: 'Code sent to email' });

    expect(usersServiceMock.requestLoginCode).toHaveBeenCalledWith(
      'user@example.com',
    );
  });

  it('/users (POST) should validate email', async () => {
    await request(app.getHttpServer())
      .post('/users')
      .send({ email: 'invalid-email' })
      .expect(400);
  });

  it('/users/verify-login-code (POST) should verify code', async () => {
    usersServiceMock.verifyLoginCode.mockResolvedValue({
      message: 'Login successful',
      session: {
        token: 'session-token',
        expiresAt: '2026-06-15T13:40:00.000Z',
      },
    });

    await request(app.getHttpServer())
      .post('/users/verify-login-code')
      .set('x-forwarded-for', '203.0.113.10')
      .send({ email: 'user@example.com', code: '123456' })
      .expect(201)
      .expect({
        message: 'Login successful',
        session: {
          token: 'session-token',
          expiresAt: '2026-06-15T13:40:00.000Z',
        },
      });

    expect(usersServiceMock.verifyLoginCode).toHaveBeenCalledWith(
      'user@example.com',
      '123456',
      expect.anything(),
    );

    const verifyLoginCodeCalls = usersServiceMock.verifyLoginCode.mock
      .calls as [string, string, { userAgent?: string; ipAddress?: string }][];
    const sessionMetadata = verifyLoginCodeCalls[0]?.[2];

    expect(sessionMetadata).toEqual(
      expect.objectContaining({
        ipAddress: '203.0.113.10',
      }),
    );
  });

  it('/users/verify-login-code (POST) should validate code format', async () => {
    await request(app.getHttpServer())
      .post('/users/verify-login-code')
      .send({ email: 'user@example.com', code: '12ab56' })
      .expect(400);
  });

  it('/users/logout (POST) should logout successfully', async () => {
    usersServiceMock.logout.mockResolvedValue({
      message: 'Logout successful',
    });

    await request(app.getHttpServer())
      .post('/users/logout')
      .send({ token: 'session-token-123' })
      .expect(201)
      .expect({ message: 'Logout successful' });

    expect(usersServiceMock.logout).toHaveBeenCalledWith('session-token-123');
  });

  it('/users/logout (POST) should handle invalid token', async () => {
    usersServiceMock.logout.mockRejectedValue(
      new Error('Invalid or expired session'),
    );

    await request(app.getHttpServer())
      .post('/users/logout')
      .send({ token: 'invalid-token' })
      .expect(500);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });
});
