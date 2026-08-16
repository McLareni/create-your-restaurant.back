import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { compare, hash } from 'bcrypt';
import { randomInt, randomUUID } from 'node:crypto';
import { Resend } from 'resend';
import { EnumRole } from '@prisma/client';
import { I18nService, I18nContext } from 'nestjs-i18n';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { getEmailVerificationTemplate } from 'src/users/templates/email-verification.template';

export type SessionMetadata = {
  userAgent?: string;
  ipAddress?: string;
};

const AUTH_CONFIG = {
  OTP_LIFE_TIME_MS: 120000,
  SESSION_LIFE_TIME_MS: 2592000000,
  REQUEST_COOLDOWN_MS: 60000,
  BRUTEFORCE: {
    MAX_ATTEMPTS: 5,
    LOCK_DURATION_MS: 300000,
  },
  MAX_MAP_SIZE: 10000,
};

@Injectable()
export class UsersService {
  private readonly loginAttempts = new Map<
    string,
    {
      count: number;
      lockUntil: number;
    }
  >();

  private readonly lastCodeRequest = new Map<string, number>();

  constructor(
    private readonly prismaService: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  cleanupMemoryMaps() {
    const now = Date.now();
    for (const [email, attempt] of this.loginAttempts.entries()) {
      if (attempt.lockUntil !== 0 && attempt.lockUntil < now) {
        this.loginAttempts.delete(email);
      }
    }
    for (const [email, timestamp] of this.lastCodeRequest.entries()) {
      if (now - timestamp > AUTH_CONFIG.REQUEST_COOLDOWN_MS) {
        this.lastCodeRequest.delete(email);
      }
    }
  }

  private getResendClient(): Resend {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new BadRequestException('errors.email_not_configured');
    }
    return new Resend(apiKey);
  }

  async requestLoginCode(email: string) {
    const lastRequestAt = this.lastCodeRequest.get(email);
    if (
      lastRequestAt &&
      Date.now() - lastRequestAt < AUTH_CONFIG.REQUEST_COOLDOWN_MS
    ) {
      throw new BadRequestException(
        'errors.please_wait_before_requesting_again',
      );
    }

    if (this.loginAttempts.size >= AUTH_CONFIG.MAX_MAP_SIZE) {
      this.loginAttempts.clear();
    }
    if (this.lastCodeRequest.size >= AUTH_CONFIG.MAX_MAP_SIZE) {
      this.lastCodeRequest.clear();
    }

    this.lastCodeRequest.set(email, Date.now());

    const resend = this.getResendClient();
    this.loginAttempts.delete(email);

    const loginCode = String(randomInt(0, 1000000)).padStart(6, '0');
    const loginCodeHash = await hash(loginCode, 12);
    const loginCodeExpiresAt = new Date(
      Date.now() + AUTH_CONFIG.OTP_LIFE_TIME_MS,
    );

    const existingUser = await this.prismaService.user.findFirst({
      where: { email },
      orderBy: { role: 'asc' },
    });

    if (existingUser) {
      await this.prismaService.user.update({
        where: { id: existingUser.id },
        data: {
          loginCodeHash,
          loginCodeExpiresAt,
        },
      });
    } else {
      await this.prismaService.user.create({
        data: {
          email,
          role: EnumRole.OWNER,
          loginCodeHash,
          loginCodeExpiresAt,
          restaurantId: null,
        },
      });
    }

    const lang = I18nContext.current()?.lang ?? 'uk';
    const subject = String(
      this.i18n.t('auth.email_verification_subject', { lang }),
    );
    const title = String(
      this.i18n.t('auth.email_verification_title', { lang }),
    );

    const emailHtml = getEmailVerificationTemplate(title, loginCode);

    try {
      const fromAddress =
        process.env.EMAIL_FROM_ADDRESS ?? 'onboarding@resend.dev';
      await resend.emails.send({
        from: `Create Your Restaurant <${fromAddress}>`,
        to: [email],
        subject,
        html: emailHtml,
        tags: [{ name: 'category', value: 'auth' }],
      });
    } catch {
      return {
        message: 'errors.email_simulation_active',
      };
    }

    return {
      message: 'auth.code_sent',
    };
  }

  async verifyLoginCode(
    email: string,
    code: string,
    sessionMetadata: SessionMetadata = {},
  ) {
    const clientAttempts = this.loginAttempts.get(email);

    if (clientAttempts && clientAttempts.lockUntil > Date.now()) {
      throw new UnauthorizedException('errors.too_many_attempts');
    }

    const user = await this.prismaService.user.findFirst({
      where: { email },
      orderBy: { role: 'asc' },
    });

    if (!user?.loginCodeHash || !user.loginCodeExpiresAt) {
      throw new UnauthorizedException('errors.invalid_code');
    }

    if (user.loginCodeExpiresAt < new Date()) {
      throw new UnauthorizedException('errors.code_expired');
    }

    const isCodeValid = await compare(code, user.loginCodeHash);

    if (!isCodeValid) {
      const currentCount = clientAttempts ? clientAttempts.count + 1 : 1;
      if (currentCount >= AUTH_CONFIG.BRUTEFORCE.MAX_ATTEMPTS) {
        this.loginAttempts.set(email, {
          count: currentCount,
          lockUntil: Date.now() + AUTH_CONFIG.BRUTEFORCE.LOCK_DURATION_MS,
        });
        throw new UnauthorizedException('errors.account_locked');
      }
      this.loginAttempts.set(email, { count: currentCount, lockUntil: 0 });
      throw new UnauthorizedException('errors.invalid_code');
    }

    this.loginAttempts.delete(email);
    this.lastCodeRequest.delete(email);

    const sessionExpiresAt = new Date(
      Date.now() + AUTH_CONFIG.SESSION_LIFE_TIME_MS,
    );
    const sessionToken = randomUUID();

    await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        loginCodeHash: null,
        loginCodeExpiresAt: null,
        sessions: {
          create: {
            token: sessionToken,
            expiresAt: sessionExpiresAt,
            userAgent: sessionMetadata.userAgent,
            ipAddress: sessionMetadata.ipAddress,
          },
        },
      },
    });

    return {
      message: 'auth.login_success',
      session: {
        token: sessionToken,
        expiresAt: sessionExpiresAt,
      },
    };
  }

  async logout(sessionToken: string) {
    if (!sessionToken) {
      throw new BadRequestException('errors.token_required');
    }

    await this.prismaService.session.deleteMany({
      where: { token: sessionToken },
    });

    return {
      message: 'auth.logout_success',
    };
  }

  async validateSessionToken(sessionToken: string) {
    if (!sessionToken) {
      throw new UnauthorizedException('errors.token_required');
    }

    const session = await this.prismaService.session.findUnique({
      where: { token: sessionToken },
      include: { user: true },
    });

    if (!session || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('errors.session_expired');
    }

    return session.user;
  }

  async getMe(sessionToken: string) {
    const user = await this.validateSessionToken(sessionToken);

    // Get all user rows with this email
    const allUserRows = await this.prismaService.user.findMany({
      where: { email: user.email },
    });

    const restaurantIds = allUserRows
      .map((u) => u.restaurantId)
      .filter((id) => id !== null);
    const ownerIds = allUserRows
      .filter((u) => u.role === 'OWNER')
      .map((u) => u.id);

    const restaurants = await this.prismaService.restaurant.findMany({
      where: {
        OR: [{ id: { in: restaurantIds } }, { ownerId: { in: ownerIds } }],
      },
      orderBy: { id: 'asc' },
    });

    return {
      user: {
        id: user.id, // Primary session ID
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        photo: user.photo,
        role: user.role, // primary role, though PermissionsGuard manages context dynamically
        phone: user.phone,
        restaurants: restaurants.map((restaurant) => ({
          id: restaurant.id,
          name: restaurant.title,
          slug: restaurant.slug,
          imageUrl: restaurant.imageUrl,
          isOwner: ownerIds.includes(restaurant.ownerId),
          currency: restaurant.currency,
        })),
      },
    };
  }
}
