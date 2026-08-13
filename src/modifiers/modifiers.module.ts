import { Module } from '@nestjs/common';
import type {} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersModule } from 'src/users/users.module';
import { ModifiersController } from 'src/modifiers/modifiers.controller';
import { ModifiersService } from 'src/modifiers/modifiers.service';

@Module({
  imports: [UsersModule],
  controllers: [ModifiersController],
  providers: [ModifiersService, PrismaService],
})
export class ModifiersModule {}
