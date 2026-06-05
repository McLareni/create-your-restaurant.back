import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WaiterZReport } from './interfaces/staff-reports.interface';
import { StaffStatus, OrderStatus } from '@prisma/client';

@Injectable()
export class StaffOperationsService {
  constructor(private readonly prisma: PrismaService) {}

  async verifyPinAndGetStaff(restaurantId: number, pinCode: string) {
    const staff = await this.prisma.user.findFirst({
      where: { restaurantId, pinCode, isActive: true },
    });
    if (!staff) {
      throw new UnauthorizedException('Invalid PIN code');
    }
    return staff;
  }

  async clockIn(restaurantId: number, pinCode: string) {
    const staff = await this.verifyPinAndGetStaff(restaurantId, pinCode);
    if (staff.status === StaffStatus.ON_DUTY) {
      throw new BadRequestException('Staff is already on duty');
    }

    const [updatedStaff] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: staff.id },
        data: { status: StaffStatus.ON_DUTY },
      }),
      this.prisma.staffShift.create({
        data: {
          userId: staff.id,
          restaurantId,
          clockIn: new Date(),
        },
      }),
    ]);

    return { status: updatedStaff.status, firstName: updatedStaff.firstName };
  }

  async clockOut(
    restaurantId: number,
    pinCode: string,
  ): Promise<WaiterZReport> {
    const staff = await this.verifyPinAndGetStaff(restaurantId, pinCode);
    if (staff.status === StaffStatus.OFF_DUTY) {
      throw new BadRequestException('Staff is not on duty');
    }

    const activeShift = await this.prisma.staffShift.findFirst({
      where: { userId: staff.id, restaurantId, clockOut: null },
      orderBy: { clockIn: 'desc' },
    });
    if (!activeShift) {
      throw new NotFoundException('No active shift found');
    }

    const endTime = new Date();
    const diffMs = endTime.getTime() - activeShift.clockIn.getTime();
    const hours = Math.max(
      parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2)),
      0.01,
    );

    const closedOrders = await this.prisma.order.findMany({
      where: {
        waiterId: staff.id,
        restaurantId,
        status: OrderStatus.COMPLETED,
        updatedAt: { gte: activeShift.clockIn, lte: endTime },
      },
    });

    const salesVolume = closedOrders.reduce(
      (sum, order) => sum + order.totalAmount,
      0,
    );

    const hourlyEarnings = hours * staff.hourlyRate;
    const percentageEarnings = (salesVolume * staff.salesPercentage) / 100;
    const totalEarnings = hourlyEarnings + percentageEarnings;

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: staff.id },
        data: { status: StaffStatus.OFF_DUTY },
      }),
      this.prisma.staffShift.update({
        where: { id: activeShift.id },
        data: {
          clockOut: endTime,
          totalHours: hours,
          earnings: totalEarnings,
        },
      }),
    ]);

    return {
      waiterId: staff.id,
      waiterName: `${staff.firstName || ''} ${staff.lastName || ''}`.trim(),
      shiftStart: activeShift.clockIn,
      shiftEnd: endTime,
      totalHours: hours,
      totalOrdersClosed: closedOrders.length,
      totalSalesVolume: salesVolume,
      baseHourlyEarnings: hourlyEarnings,
      percentageEarnings,
      finalTotalEarnings: totalEarnings,
    };
  }

  async authorizeVoid(
    restaurantId: number,
    managerPin: string,
    orderId: string,
  ) {
    const manager = await this.prisma.user.findFirst({
      where: {
        restaurantId,
        pinCode: managerPin,
        role: 'OWNER',
        isActive: true,
      },
    });
    if (!manager) {
      throw new UnauthorizedException(
        'Manager authorization failed. Access denied.',
      );
    }

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, restaurantId },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.CANCELED,
        voidedBy: manager.id,
      },
    });

    return { success: true, voidedBy: manager.firstName };
  }
}
