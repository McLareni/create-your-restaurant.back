import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import type { CreateTableDto } from 'src/tables/dto/create-table.dto';
import type { UpdateTableDto } from 'src/tables/dto/update-table.dto';

@Injectable()
export class TablesService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll(restaurantId: number) {
    return await this.prismaService.diningTable.findMany({
      where: { restaurantId },
      orderBy: { number: 'asc' },
      take: 100,
    });
  }

  async create(restaurantId: number, dto: CreateTableDto) {
    try {
      return await this.prismaService.diningTable.create({
        data: {
          number: Number(dto.number),
          type: dto.type,
          status: dto.status || 'INACTIVE',
          restaurantId,
          zone: dto.zone || null,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('errors.table_number_exists');
      }
      throw error;
    }
  }

  async update(restaurantId: number, id: string, dto: UpdateTableDto) {
    const table = await this.prismaService.diningTable.findUnique({
      where: { id },
    });
    if (!table || table.restaurantId !== restaurantId) {
      throw new NotFoundException('errors.table_not_found');
    }
    try {
      return await this.prismaService.diningTable.update({
        where: { id },
        data: {
          ...(dto.number !== undefined && { number: Number(dto.number) }),
          ...(dto.type !== undefined && { type: dto.type }),
          ...(dto.status !== undefined && { status: dto.status }),
          ...(dto.zone !== undefined && { zone: dto.zone }),
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('errors.table_number_exists');
      }
      throw error;
    }
  }

  async delete(restaurantId: number, id: string) {
    const table = await this.prismaService.diningTable.findUnique({
      where: { id },
    });
    if (!table || table.restaurantId !== restaurantId) {
      throw new NotFoundException('errors.table_not_found');
    }
    await this.prismaService.diningTable.delete({
      where: { id },
    });
    return { message: 'responses.table_deleted_successfully' };
  }

  async checkPublicTableExists(restaurantId: number, id: string) {
    const table = await this.prismaService.diningTable.findFirst({
      where: { id, restaurantId, status: 'ACTIVE' },
      select: { id: true },
    });
    return { exists: Boolean(table) };
  }
}
