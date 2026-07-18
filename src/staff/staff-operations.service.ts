import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EnumRole, OrderStatus } from '@prisma/client';
import type { WaiterZReport } from './interfaces/staff-reports.interface';

@Injectable()
export class StaffOperationsService {
  constructor(private readonly prismaService: PrismaService) {}

  async verifyPinAndGetStaff(restaurantId: number, pinCode: string) {
    const staff = await this.prismaService.user.findFirst({
      where: { restaurantId, pinCode, isActive: true },
    });
    if (!staff) {
      throw new UnauthorizedException('Invalid PIN code');
    }
    return staff;
  }

  async authorizeVoid(
    restaurantId: number,
    managerPin: string,
    orderId: string,
  ) {
    const manager = await this.prismaService.user.findFirst({
      where: {
        restaurantId,
        pinCode: managerPin,
        role: EnumRole.OWNER,
        isActive: true,
      },
    });
    if (!manager) {
      throw new UnauthorizedException(
        'Manager authorization failed. Access denied.',
      );
    }
    const order = await this.prismaService.order.findFirst({
      where: { id: orderId, restaurantId },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    await this.prismaService.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.CANCELED,
      },
    });
    return { success: true, voidedBy: manager.firstName };
  }

  async clockIn(restaurantId: number, pinCode: string) {
    const staff = await this.verifyPinAndGetStaff(restaurantId, pinCode);
    return {
      status: 'success',
      firstName: staff.firstName || 'Staff',
    };
  }

  async clockOut(
    restaurantId: number,
    pinCode: string,
  ): Promise<WaiterZReport> {
    const staff = await this.verifyPinAndGetStaff(restaurantId, pinCode);
    const shiftEnd = new Date();
    const shiftStart = staff.updatedAt;
    const totalHours = Math.max(
      0.1,
      (shiftEnd.getTime() - shiftStart.getTime()) / (1000 * 60 * 60),
    );

    const closedOrders = await this.prismaService.order.findMany({
      where: {
        restaurantId,
        waiterId: staff.id,
        status: OrderStatus.COMPLETED,
        updatedAt: {
          gte: shiftStart,
        },
      },
    });

    const totalOrdersClosed = closedOrders.length;
    const totalSalesVolume = closedOrders.reduce(
      (sum, o) => sum + o.totalAmount,
      0,
    );
    const baseHourlyEarnings = totalHours * 50;
    const percentageEarnings = (totalSalesVolume * 3) / 100;
    const finalTotalEarnings = baseHourlyEarnings + percentageEarnings;

    return {
      waiterId: staff.id,
      waiterName: `${staff.firstName || ''} ${staff.lastName || ''}`.trim() || 'Staff',
      shiftStart,
      shiftEnd,
      totalHours: Math.round(totalHours * 100) / 100,
      totalOrdersClosed,
      totalSalesVolume,
      baseHourlyEarnings,
      percentageEarnings,
      finalTotalEarnings,
    };
  }
}
