import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { compare, hash } from 'bcrypt';
import { randomInt, randomUUID } from 'node:crypto';
import { Resend } from 'resend';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type SessionMetadata = {
  userAgent?: string;
  ipAddress?: string;
};

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}

  private getResendClient() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new BadRequestException('Email service is not configured');
    }
    return new Resend(apiKey);
  }

  async requestLoginCode(email: string) {
    const resend = this.getResendClient();
    const loginCode = String(randomInt(0, 1000000)).padStart(6, '0');
    const loginCodeHash = await hash(loginCode, 10);
    const loginCodeExpiresAt = new Date(Date.now() + 2 * 60 * 1000);

    await this.prismaService.user.upsert({
      where: { email },
      create: {
        email,
        firstName: email.split('@')[0] || 'User',
        role: Role.OWNER,
      },
      update: {},
    });

    await this.prismaService.loginCode.upsert({
      where: { email },
      create: {
        email,
        code: loginCodeHash,
        expiresAt: loginCodeExpiresAt,
      },
      update: {
        code: loginCodeHash,
        expiresAt: loginCodeExpiresAt,
      },
    });

    await resend.emails.send({
      from: 'Create Your Restaurant <onboarding@resend.dev>',
      to: [email],
      subject: 'Your login code',
      html: `<p>Your login code is <strong>${loginCode}</strong>. It expires in 2 minutes.</p>`,
    });

    return { message: 'Code sent to email' };
  }

  async verifyLoginCode(
    email: string,
    code: string,
    sessionMetadata: SessionMetadata = {},
  ) {
    const user = await this.prismaService.user.findUnique({
      where: { email },
    });

    const activeCode = await this.prismaService.loginCode.findUnique({
      where: { email },
    });

    if (!user || !activeCode) {
      throw new UnauthorizedException('Invalid code');
    }

    if (activeCode.expiresAt < new Date()) {
      throw new UnauthorizedException('Code expired');
    }

    const isCodeValid = await compare(code, activeCode.code);
    if (!isCodeValid) {
      throw new UnauthorizedException('Invalid code');
    }

    const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const sessionToken = randomUUID();

    await this.prismaService.$transaction([
      this.prismaService.loginCode.delete({ where: { email } }),
      this.prismaService.session.create({
        data: {
          token: sessionToken,
          expiresAt: sessionExpiresAt,
          userId: user.id,
        },
      }),
    ]);

    return {
      message: `Login for ${email} successful`,
      session: { token: sessionToken },
    };
  }

  async logout(sessionToken: string) {
    if (!sessionToken) {
      throw new BadRequestException('Session token is required');
    }
    await this.prismaService.session.deleteMany({
      where: { token: sessionToken },
    });
    return { message: 'Logout successful' };
  }

  async validateSessionToken(sessionToken: string) {
    if (!sessionToken) {
      throw new UnauthorizedException('Session token is required');
    }
    const session = await this.prismaService.session.findUnique({
      where: { token: sessionToken },
      include: { user: true },
    });

    if (!session || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Invalid or expired session token');
    }
    return session.user;
  }

  async getMe(sessionToken: string) {
    const user = await this.validateSessionToken(sessionToken);
    const restaurants = await this.prismaService.restaurant.findMany({
      where: { ownerId: user.id },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        photo: user.photo,
        role: user.role,
        restaurants: restaurants.map((r) => ({
          id: r.id,
          name: r.title,
        })),
      },
    };
  }
}