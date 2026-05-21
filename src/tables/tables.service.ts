import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, TableStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';

@Injectable()
export class TablesService {
  constructor(private readonly prisma: PrismaService) {}

  private async checkAccess(restaurantId: number, userId: number) {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: { id: restaurantId, ownerId: userId },
    });
    if (!restaurant) {
      throw new ForbiddenException('Access to this restaurant is denied');
    }
  }

  async getAll(restaurantId: number, userId: number) {
    await this.checkAccess(restaurantId, userId);

    const dbTables = await this.prisma.diningTable.findMany({
      where: { restaurantId },
      orderBy: { number: 'asc' },
    });

    return dbTables.map((table) => ({
      ...table,
      canAcceptOrders: table.status === TableStatus.ACTIVE,
    }));
  }
  async getTables(restaurantId: number, userId: number) {
    return this.getAll(restaurantId, userId);
  }

  async checkTableExists(restaurantId: number, tableId: string) {
    const table = await this.prisma.diningTable.findFirst({
      where: { id: tableId, restaurantId },
      select: { id: true },
    });

    return { exists: Boolean(table) };
  }

  async create(restaurantId: number, dto: CreateTableDto, userId: number) {
    await this.checkAccess(restaurantId, userId);

    try {
      const created = await this.prisma.diningTable.create({
        data: {
          id: randomUUID(),
          restaurantId,
          number: dto.number,
          status: dto.status ?? TableStatus.ACTIVE,
          type: dto.type,
        },
      });

      return {
        message: 'Table created successfully',
        table: {
          ...created,
          canAcceptOrders: created.status === TableStatus.ACTIVE,
        },
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Table number already exists for this restaurant',
        );
      }
      throw error;
    }
  }

  async createTable(restaurantId: number, dto: CreateTableDto, userId: number) {
    return this.create(restaurantId, dto, userId);
  }

  async update(
    restaurantId: number,
    tableId: string,
    dto: UpdateTableDto,
    userId: number,
  ) {
    await this.checkAccess(restaurantId, userId);

    const existing = await this.prisma.diningTable.findFirst({
      where: { id: tableId, restaurantId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Table not found');
    }

    try {
      const updated = await this.prisma.diningTable.update({
        where: { id: tableId },
        data: dto,
      });

      return {
        message: 'Table updated successfully',
        table: {
          ...updated,
          canAcceptOrders: updated.status === TableStatus.ACTIVE,
        },
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Table number already exists for this restaurant',
        );
      }
      throw error;
    }
  }

  async updateTable(
    restaurantId: number,
    tableId: string,
    dto: UpdateTableDto,
    userId: number,
  ) {
    return this.update(restaurantId, tableId, dto, userId);
  }

  async delete(restaurantId: number, tableId: string, userId: number) {
    await this.checkAccess(restaurantId, userId);

    const existing = await this.prisma.diningTable.findFirst({
      where: { id: tableId, restaurantId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Table not found');
    }

    await this.prisma.diningTable.delete({ where: { id: tableId } });
    return { message: 'Table deleted successfully' };
  }

  async deleteTable(restaurantId: number, tableId: string, userId: number) {
    return this.delete(restaurantId, tableId, userId);
  }
}
