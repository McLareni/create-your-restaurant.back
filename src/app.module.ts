import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MenuModule } from './menu/menu.module';
import { PrismaService } from './prisma/prisma.service';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { UsersModule } from './users/users.module';
import { StaffModule } from './staff/staff.module';
import { ModifiersModule } from './modifiers/modifiers.module';
import { CombosModule } from './combos/combos.module';
import { TablesModule } from './tables/tables.module';
import { InventoryModule } from './inventory/inventory.module';
import { PosModule } from './pos/pos.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { LiveCallsModule } from './live-calls/live-calls.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MenuModule,
    RestaurantsModule,
    UsersModule,
    StaffModule,
    ModifiersModule,
    CombosModule,
    TablesModule,
    InventoryModule,
    PosModule,
    AnalyticsModule,
    LiveCallsModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
