import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { compare, hash } from 'bcrypt';
import { randomInt } from 'node:crypto';
import { Resend } from 'resend';
import { EnumRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

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
      to: email,
      subject: 'Your login code',
      html: `<p>Your login code is <strong>${loginCode}</strong>. It expires in 2 minutes.</p>`,
    });

    return {
      message: 'Code sent to email',
    };
  }

  async verifyLoginCode(email: string, code: string) {
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

    await this.prismaService.user.update({
      where: { email },
      data: {
        loginCodeHash: null,
        loginCodeExpiresAt: null,
      },
    });

    return {
      message: `Login for ${email} successful`,
    };
  }
}
