import { Module } from '@nestjs/common';
import { LiveCallsService } from './live-calls.service';
import { LiveCallsController } from './live-calls.controller';
import { LiveMonitorModule } from 'src/live-monitor/live-monitor.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [LiveMonitorModule, UsersModule], // To access LiveMonitorGateway and guards
  controllers: [LiveCallsController],
  providers: [LiveCallsService, PrismaService],
  exports: [LiveCallsService],
})
export class LiveCallsModule {}
