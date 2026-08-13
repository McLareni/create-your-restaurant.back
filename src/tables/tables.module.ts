import { Module } from '@nestjs/common';
import type {} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersModule } from 'src/users/users.module';
import { TablesController } from 'src/tables/tables.controller';
import { TablesService } from 'src/tables/tables.service';

@Module({
  imports: [UsersModule],
  controllers: [TablesController],
  providers: [TablesService, PrismaService],
})
export class TablesModule {}
