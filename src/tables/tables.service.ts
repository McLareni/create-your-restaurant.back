// src/tables/tables.service.ts
import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';

@Injectable()
export class TablesService {
  constructor(private readonly prismaService: PrismaService) {}

  private async checkAccess(restaurantId: number, userId: number) {
    const restaurant = await this.prismaService.restaurant.findFirst({
      where: { id: restaurantId, ownerId: userId },
    });
    if (!restaurant) {
      throw new ForbiddenException('Access to this restaurant is denied');
    }
  }

  async findAll(restaurantId: number, userId: number) {
    await this.checkAccess(restaurantId, userId);
    return this.prismaService.diningTable.findMany({
      where: { restaurantId },
      orderBy: { number: 'asc' },
    });
  }

  async create(restaurantId: number, dto: CreateTableDto, userId: number) {
    await this.checkAccess(restaurantId, userId);

    const exists = await this.prismaService.diningTable.findFirst({
      where: {
        number: Number(dto.number),
        restaurantId,
      },
    });

    if (exists) {
      throw new ConflictException('Table with this number already exists');
    }

    return this.prismaService.diningTable.create({
      data: {
        number: Number(dto.number),
        type: dto.type,
        status: dto.status || 'INACTIVE',
        restaurantId,
        zone: dto.zone || null,
      },
    });
  }

  async update(
    restaurantId: number,
    id: string,
    dto: UpdateTableDto,
    userId: number,
  ) {
    await this.checkAccess(restaurantId, userId);

    const table = await this.prismaService.diningTable.findUnique({
      where: { id },
    });

    if (!table || table.restaurantId !== restaurantId) {
      throw new NotFoundException('Table not found');
    }

    if (dto.number !== undefined) {
      const targetNumber = Number(dto.number);
      if (targetNumber !== table.number) {
        const exists = await this.prismaService.diningTable.findFirst({
          where: { number: targetNumber, restaurantId },
        });
        if (exists) {
          throw new ConflictException('Table with this number already exists');
        }
      }
    }

    return this.prismaService.diningTable.update({
      where: { id },
      data: {
        ...(dto.number !== undefined && { number: Number(dto.number) }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.zone !== undefined && { zone: dto.zone }),
      },
    });
  }

  async delete(restaurantId: number, id: string, userId: number) {
    await this.checkAccess(restaurantId, userId);

    const table = await this.prismaService.diningTable.findUnique({
      where: { id },
    });

    if (!table || table.restaurantId !== restaurantId) {
      throw new NotFoundException('Table not found');
    }

    await this.prismaService.diningTable.delete({
      where: { id },
    });

    return { success: true };
  }

  async checkPublicTableExists(restaurantId: number, id: string) {
    const table = await this.prismaService.diningTable.findFirst({
      where: {
        id,
        restaurantId,
        status: 'ACTIVE',
      },
      select: { id: true },
    });

    return { exists: Boolean(table) };
  }
}
