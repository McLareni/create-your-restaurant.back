import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TriggerCallDto, WaiterCallType } from './dto/trigger-call.dto';

@Injectable()
export class LiveCallsService {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveCalls(restaurantId: number) {
    const tables = await this.prisma.diningTable.findMany({
      where: {
        restaurantId,
        isWaiterCallActive: true,
      },
      select: {
        id: true,
        number: true,
        waiterCallType: true,
        waiterCallPaymentMethod: true,
        waiterCallRequestedAt: true,
      },
      orderBy: { waiterCallRequestedAt: 'asc' },
    });

    return tables.map((table) => ({
      id: table.id, // The call ID is effectively the table ID
      tableId: table.id,
      tableNumber: table.number,
      type: table.waiterCallType || 'WAITER',
      paymentMethod: table.waiterCallPaymentMethod,
      createdAt:
        table.waiterCallRequestedAt?.toISOString() || new Date().toISOString(),
    }));
  }

  async dismissCall(restaurantId: number, tableId: string) {
    const table = await this.prisma.diningTable.findFirst({
      where: {
        id: tableId,
        restaurantId,
      },
      select: { id: true },
    });

    if (!table) {
      throw new NotFoundException('errors.table_not_found');
    }

    await this.prisma.diningTable.update({
      where: { id: tableId },
      data: {
        isWaiterCallActive: false,
        waiterCallRequestedAt: null,
        waiterCallPaymentMethod: null,
      },
    });

    return {
      message: 'responses.waiter_call_resolved',
      tableId,
    };
  }

  async triggerPublicCall(restaurantId: number, data: TriggerCallDto) {
    const table = await this.prisma.diningTable.findFirst({
      where: {
        id: data.tableId,
        restaurantId,
      },
      select: { id: true, isWaiterCallActive: true, waiterCallType: true },
    });

    if (!table) {
      throw new NotFoundException('errors.table_not_found');
    }

    if (table.isWaiterCallActive && table.waiterCallType === data.type) {
      throw new BadRequestException('errors.waiter_call_already_active');
    }

    await this.prisma.diningTable.update({
      where: { id: data.tableId },
      data: {
        isWaiterCallActive: true,
        waiterCallRequestedAt: new Date(),
        waiterCallType: data.type,
        waiterCallPaymentMethod:
          data.type === WaiterCallType.BILL
            ? (data.paymentMethod ?? null)
            : null,
      },
    });

    return {
      message: 'responses.waiter_call_created',
      tableId: data.tableId,
    };
  }
}
