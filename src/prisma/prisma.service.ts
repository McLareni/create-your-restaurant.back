import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not set');
    }

    if (databaseUrl.startsWith('prisma+postgres://')) {
      super({
        accelerateUrl: databaseUrl,
      });
      return;
    }

    if (
      databaseUrl.startsWith('postgres://') ||
      databaseUrl.startsWith('postgresql://')
    ) {
      super({
        adapter: new PrismaPg({ connectionString: databaseUrl }),
      });
      return;
    }

    throw new Error(
      'Unsupported DATABASE_URL scheme. Use prisma+postgres://, postgres://, or postgresql://',
    );
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
