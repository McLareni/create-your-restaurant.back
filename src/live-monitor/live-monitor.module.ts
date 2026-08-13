import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersModule } from '../users/users.module';
import { LiveMonitorController } from './live-monitor.controller';
import { LiveMonitorGateway } from './live-monitor.gateway';
import { LiveMonitorService } from './live-monitor.service';

@Module({
  imports: [UsersModule],
  controllers: [LiveMonitorController],
  providers: [LiveMonitorService, LiveMonitorGateway, PrismaService],
  exports: [LiveMonitorGateway],
})
export class LiveMonitorModule {}
