import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { compare, hash } from 'bcrypt';
import { randomInt, randomUUID } from 'node:crypto';
import { Resend } from 'resend';
import { EnumRole } from '@prisma/client';
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
        role: EnumRole.OWNER,
        loginCodeHash,
        loginCodeExpiresAt,
      },
      update: {
        loginCodeHash,
        loginCodeExpiresAt,
      },
    });

    await resend.emails.send({
      from: 'Create Your Restaurant <onboarding@resend.dev>',
      to: [email],
      subject: 'Your login code',
      html: `<p>Your login code is <strong>${loginCode}</strong>. It expires in 2 minutes.</p>`,
    });

    return {
      message: 'Code sent to email',
    };
  }

  async verifyLoginCode(
    email: string,
    code: string,
    sessionMetadata: SessionMetadata = {},
  ) {
    const user = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (!user?.loginCodeHash || !user.loginCodeExpiresAt) {
      throw new UnauthorizedException('Invalid code');
    }

    if (user.loginCodeExpiresAt < new Date()) {
      throw new UnauthorizedException('Code expired');
    }

    const isCodeValid = await compare(code, user.loginCodeHash);

    if (!isCodeValid) {
      throw new UnauthorizedException('Invalid code');
    }

    const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const sessionToken = randomUUID();
    const sessionTokenHash = await hash(sessionToken, 10);

    await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        loginCodeHash: null,
        loginCodeExpiresAt: null,
        sessions: {
          create: {
            token: sessionTokenHash,
            expiresAt: sessionExpiresAt,
            userAgent: sessionMetadata.userAgent,
            ipAddress: sessionMetadata.ipAddress,
          },
        },
      },
    });

    return {
      message: `Login for ${email} successful`,
      session: {
        token: sessionToken,
      },
    };
  }

  async logout(sessionToken: string) {
    if (!sessionToken) {
      throw new BadRequestException('Session token is required');
    }

    const sessionTokenHash = await hash(sessionToken, 10);
    await this.prismaService.session.deleteMany({
      where: { token: sessionTokenHash },
    });

    return {
      message: 'Logout successful',
    };
  }

  async validateSessionToken(sessionToken: string) {
    if (!sessionToken) {
      throw new UnauthorizedException('Session token is required');
    }

    // Find all sessions and compare with the provided token
    const sessions = await this.prismaService.session.findMany({
      include: { user: true },
    });

    for (const session of sessions) {
      const isTokenValid = await compare(sessionToken, session.token);

      if (isTokenValid && session.expiresAt > new Date()) {
        return session.user;
      }
    }

    throw new UnauthorizedException('Invalid or expired session token');
  }
}
