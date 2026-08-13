import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersModule } from '../users/users.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [UsersModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, PrismaService],
})
export class AnalyticsModule {}
