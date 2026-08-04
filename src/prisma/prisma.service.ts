import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  InternalServerErrorException,
} from '@nestjs/common';
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
      throw new InternalServerErrorException('errors.database_url_not_set');
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

    throw new InternalServerErrorException(
      'errors.unsupported_database_url_scheme',
    );
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
