import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EnumRole, OrderStatus } from '@prisma/client';

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

  async authorizeVoid(
    restaurantId: number,
    managerPin: string,
    orderId: string,
  ) {
    const manager = await this.prisma.user.findFirst({
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
      },
    });

    return { success: true, voidedBy: manager.firstName };
  }
}
