import { Module } from '@nestjs/common';
import { LiveMonitorModule } from 'src/live-monitor/live-monitor.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersModule } from 'src/users/users.module';
import { OrdersController } from 'src/orders/orders.controller';
import { OrdersService } from 'src/orders/orders.service';

@Module({
  imports: [UsersModule, LiveMonitorModule],
  controllers: [OrdersController],
  providers: [OrdersService, PrismaService],
})
export class OrdersModule {}
