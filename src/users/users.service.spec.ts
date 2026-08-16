import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { I18nService } from 'nestjs-i18n';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { jest } from '@jest/globals';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-code'),
  compare: jest.fn(),
}));

jest.mock('resend', () => {
  return {
    Resend: jest.fn().mockImplementation(() => ({
      emails: { send: jest.fn().mockResolvedValue({}) },
    })),
  };
});

describe('UsersService', () => {
  let service: UsersService;
  let prisma: any;
  let i18n: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      session: {
        deleteMany: jest.fn(),
        findUnique: jest.fn(),
      },
      restaurant: {
        findMany: jest.fn(),
      },
    };

    i18n = {
      t: jest.fn().mockReturnValue('translated text'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: I18nService, useValue: i18n },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);

    // Clear the maps
    (service as any).lastCodeRequest.clear();
    (service as any).loginAttempts.clear();

    // Setup process.env
    process.env.RESEND_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('requestLoginCode', () => {
    it('should throw BadRequestException if requested too soon', async () => {
      (service as any).lastCodeRequest.set('test@test.com', Date.now());

      await expect(service.requestLoginCode('test@test.com')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create a new user and send code if user does not exist', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      const result = await service.requestLoginCode('test@test.com');

      expect(result.message).toBe('auth.code_sent');
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'test@test.com',
          }),
        }),
      );
    });

    it('should update existing user and send code', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 1,
        email: 'test@test.com',
      });

      const result = await service.requestLoginCode('test@test.com');

      expect(result.message).toBe('auth.code_sent');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            loginCodeHash: 'hashed-code',
          }),
        }),
      );
    });
  });

  describe('verifyLoginCode', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.verifyLoginCode('test@test.com', '123456'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if code expired', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 1,
        loginCodeHash: 'hash',
        loginCodeExpiresAt: new Date(Date.now() - 10000), // Expired
      });

      await expect(
        service.verifyLoginCode('test@test.com', '123456'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException and increase attempts if code invalid', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 1,
        loginCodeHash: 'hash',
        loginCodeExpiresAt: new Date(Date.now() + 10000), // Valid
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.verifyLoginCode('test@test.com', '123456'),
      ).rejects.toThrow(UnauthorizedException);

      const attempts = (service as any).loginAttempts.get('test@test.com');
      expect(attempts).toBeDefined();
      expect(attempts.count).toBe(1);
    });

    it('should lock account after max attempts', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 1,
        loginCodeHash: 'hash',
        loginCodeExpiresAt: new Date(Date.now() + 10000),
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      (service as any).loginAttempts.set('test@test.com', {
        count: 4,
        lockUntil: 0,
      }); // Next attempt will be 5th

      await expect(
        service.verifyLoginCode('test@test.com', '123456'),
      ).rejects.toThrow(new UnauthorizedException('errors.account_locked'));

      const attempts = (service as any).loginAttempts.get('test@test.com');
      expect(attempts.lockUntil).toBeGreaterThan(Date.now());
    });

    it('should verify code and return session', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 1,
        loginCodeHash: 'hash',
        loginCodeExpiresAt: new Date(Date.now() + 100000),
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.verifyLoginCode('test@test.com', '123456');

      expect(result.message).toBe('auth.login_success');
      expect(result.session).toBeDefined();
      expect(result.session.token).toBeDefined();

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            loginCodeHash: null,
            loginCodeExpiresAt: null,
            sessions: expect.anything(),
          }),
        }),
      );
    });
  });

  describe('logout', () => {
    it('should throw if no token', async () => {
      await expect(service.logout('')).rejects.toThrow(BadRequestException);
    });

    it('should delete session', async () => {
      await service.logout('some-token');
      expect(prisma.session.deleteMany).toHaveBeenCalledWith({
        where: { token: 'some-token' },
      });
    });
  });
});
