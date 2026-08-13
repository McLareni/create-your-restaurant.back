import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersModule } from '../users/users.module';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

@Module({
  imports: [UsersModule],
  controllers: [InventoryController],
  providers: [InventoryService, PrismaService],
})
export class InventoryModule {}
