import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
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
import { OrdersModule } from 'src/orders/orders.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { StripeModule } from 'src/stripe/stripe.module';
import { PrismaExceptionFilter } from 'src/common/filters/prisma-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    I18nModule.forRoot({
      fallbackLanguage: 'uk',
      loaderOptions: {
        path: path.join(__dirname, '../i18n/'),
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
    OrdersModule,
    StripeModule,
  ],
  controllers: [],
  providers: [
    PrismaService,
    {
      provide: APP_FILTER,
      useClass: PrismaExceptionFilter,
    },
  ],
})
export class AppModule {}
