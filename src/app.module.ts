import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import {
  AcceptLanguageResolver,
  CookieResolver,
  I18nModule,
} from 'nestjs-i18n';
import * as path from 'node:path';
import { MenuModule } from 'src/menu/menu.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { RestaurantsModule } from 'src/restaurants/restaurants.module';
import { UsersModule } from 'src/users/users.module';
import { StaffModule } from 'src/staff/staff.module';
import { ModifiersModule } from 'src/modifiers/modifiers.module';
import { CombosModule } from 'src/combos/combos.module';
import { TablesModule } from 'src/tables/tables.module';
import { InventoryModule } from 'src/inventory/inventory.module';
import { PosModule } from 'src/pos/pos.module';
import { AnalyticsModule } from 'src/analytics/analytics.module';
import { LiveMonitorModule } from 'src/live-monitor/live-monitor.module';
import { LiveCallsModule } from 'src/live-calls/live-calls.module';
import { OrdersModule } from 'src/orders/orders.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { StripeModule } from 'src/stripe/stripe.module';
import { PrismaExceptionFilter } from 'src/common/filters/prisma-exception.filter';
import { VisualModule } from './visual/visual.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 200,
      },
    ]),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    I18nModule.forRoot({
      fallbackLanguage: 'uk',
      loaderOptions: {
        path: path.join(__dirname, 'i18n/'),
        watch: true,
      },
      resolvers: [new CookieResolver(['gustio_lang']), AcceptLanguageResolver],
    }),
    CloudinaryModule,
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
    LiveMonitorModule,
    LiveCallsModule,
    OrdersModule,
    StripeModule,
    VisualModule,
  ],
  controllers: [],
  providers: [
    PrismaService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: PrismaExceptionFilter,
    },
  ],
})
export class AppModule {}
