import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TableStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

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

    return dbTables.map(t => ({
      id: t.id,
      tableNumber: String(t.number),
      type: t.type,
      isActive: t.status === TableStatus.ACTIVE,
      qrUrl: `https://gustio.com/menu/${restaurantId}?table=${t.id}`,
    }));
  }


  async checkTableExists(restaurantId: number, tableId: string) {
    const table = await this.prismaService.diningTable.findFirst({
      where: {
        id: tableId,
        restaurantId,
      },
      select: { id: true },
    });

    return {
      exists: Boolean(table),
    };
  }

  async updateTable(
    restaurantId: number,
    tableId: string,
    updateTableDto: UpdateTableDto,
    userId: number,
  ) {
    await this.ensureRestaurantOwner(restaurantId, userId);
    await this.ensureTableBelongsToRestaurant(restaurantId, tableId);

    try {
      const updatedTable = await this.prismaService.diningTable.update({
        where: { id: tableId },
        data: updateTableDto,
      });

      return {
        message: 'Table updated successfully',
        table: {
          ...updatedTable,
          canAcceptOrders: updatedTable.status === TableStatus.ACTIVE,
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

  async create(restaurantId: number, dto: any, userId: number) {
    await this.checkAccess(restaurantId, userId);


    const parsedNumber = parseInt(dto.tableNumber, 10);
    if (isNaN(parsedNumber)) {
      throw new ConflictException('Table number must be a valid integer');
    }

    const existing = await this.prisma.diningTable.findUnique({
      where: {
        restaurantId_number: { restaurantId, number: parsedNumber }
      }
    });

    if (existing) {
      throw new ConflictException('Table with this number already exists');
    }

    const tableId = randomUUID();
    const newTable = await this.prisma.diningTable.create({
      data: {
        id: tableId,
        restaurantId,
        number: parsedNumber,
        type: dto.type,
        status: dto.isActive === false ? TableStatus.INACTIVE : TableStatus.ACTIVE,
      },
    });

    return {
      id: newTable.id,
      tableNumber: String(newTable.number),
      type: newTable.type,
      isActive: newTable.status === TableStatus.ACTIVE,
      qrUrl: `https://gustio.com/menu/${restaurantId}?table=${newTable.id}`,
    };
  }

  async update(restaurantId: number, id: string, dto: any, userId: number) {
    await this.checkAccess(restaurantId, userId);
    
    const table = await this.prisma.diningTable.findUnique({ where: { id } });
    if (!table || table.restaurantId !== restaurantId) {
      throw new NotFoundException('Table not found');
    }

    const data: any = {};
    if (dto.type) data.type = dto.type;
    if (dto.isActive !== undefined) {
      data.status = dto.isActive ? TableStatus.ACTIVE : TableStatus.INACTIVE;
    }
    if (dto.tableNumber) {
      data.number = parseInt(dto.tableNumber, 10) || table.number;
    }

    const updated = await this.prisma.diningTable.update({
      where: { id },
      data,
    });

    return {
      id: updated.id,
      tableNumber: String(updated.number),
      type: updated.type,
      isActive: updated.status === TableStatus.ACTIVE,
      qrUrl: `https://gustio.com/menu/${restaurantId}?table=${updated.id}`,
    };
  }

  async delete(restaurantId: number, id: string, userId: number) {
    await this.checkAccess(restaurantId, userId);
    const table = await this.prisma.diningTable.findUnique({ where: { id } });
    if (!table || table.restaurantId !== restaurantId) {
      throw new NotFoundException('Table not found');
    }

    await this.prisma.diningTable.delete({ where: { id } });
    return { message: 'Table deleted successfully' };
  }
}
