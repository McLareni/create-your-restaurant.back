import { Module } from '@nestjs/common';
import type {} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersModule } from 'src/users/users.module';
import { CombosController } from 'src/combos/combos.controller';
import { CombosService } from 'src/combos/combos.service';

@Module({
  imports: [UsersModule],
  controllers: [CombosController],
  providers: [CombosService, PrismaService],
})
export class CombosModule {}
