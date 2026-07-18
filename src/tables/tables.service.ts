import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
      take: 100,
    });
  }

  async create(restaurantId: number, dto: CreateTableDto, userId: number) {
    await this.checkAccess(restaurantId, userId);
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
        throw new ConflictException('Table with this number already exists');
      }
      throw error;
    }
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
        throw new ConflictException('Table with this number already exists');
      }
      throw error;
    }
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
      where: { id, restaurantId, status: 'ACTIVE' },
      select: { id: true },
    });
    return { exists: Boolean(table) };
  }
}
