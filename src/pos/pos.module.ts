import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersModule } from 'src/users/users.module';
import { PosController } from 'src/pos/pos.controller';
import { PosService } from 'src/pos/pos.service';
import { PosAdapterFactory, PosterAdapter } from 'src/pos/adapters/pos.adapter';

@Module({
  imports: [UsersModule],
  controllers: [PosController],
  providers: [PosService, PrismaService, PosAdapterFactory, PosterAdapter],
})
export class PosModule {}
