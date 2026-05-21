import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TableStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';

@Injectable()
export class TablesService {
  constructor(private readonly prismaService: PrismaService) {}

  async createTable(
    restaurantId: number,
    createTableDto: CreateTableDto,
    userId: number,
  ) {
    await this.ensureRestaurantOwner(restaurantId, userId);

    try {
      const table = await this.prismaService.diningTable.create({
        data: {
          restaurantId,
          number: createTableDto.number,
          type: createTableDto.type,
          status: createTableDto.status ?? TableStatus.ACTIVE,
        },
      });

      return {
        message: 'Table created successfully',
        table: {
          ...table,
          canAcceptOrders: table.status === TableStatus.ACTIVE,
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

  async getTables(restaurantId: number, userId: number) {
    await this.ensureRestaurantOwner(restaurantId, userId);

    const tables = await this.prismaService.diningTable.findMany({
      where: { restaurantId },
      orderBy: { number: 'asc' },
    });

    return tables.map((table) => ({
      ...table,
      canAcceptOrders: table.status === TableStatus.ACTIVE,
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

      throw error;
    }
  }

  async deleteTable(restaurantId: number, tableId: string, userId: number) {
    await this.ensureRestaurantOwner(restaurantId, userId);
    await this.ensureTableBelongsToRestaurant(restaurantId, tableId);

    await this.prismaService.diningTable.delete({
      where: { id: tableId },
    });

    return {
      message: 'Table deleted successfully',
    };
  }

  private async ensureRestaurantOwner(restaurantId: number, userId: number) {
    const restaurant = await this.prismaService.restaurant.findFirst({
      where: {
        id: restaurantId,
        ownerId: userId,
      },
      select: { id: true },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }
  }

  private async ensureTableBelongsToRestaurant(
    restaurantId: number,
    tableId: string,
  ) {
    const table = await this.prismaService.diningTable.findFirst({
      where: {
        id: tableId,
        restaurantId,
      },
      select: { id: true },
    });

    if (!table) {
      throw new NotFoundException('Table not found');
    }
  }
}
