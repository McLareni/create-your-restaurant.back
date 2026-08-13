import { Module } from '@nestjs/common';
import { VisualService } from './visual.service';
import { VisualController } from './visual.controller';
import { PrismaService } from 'src/prisma/prisma.service';

import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [UsersModule],
  providers: [VisualService, PrismaService],
  controllers: [VisualController],
})
export class VisualModule {}
