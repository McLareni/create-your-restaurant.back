import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { compare } from 'bcrypt';
import { EnumRole, OrderStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class StaffOperationsService {
  constructor(private readonly prismaService: PrismaService) {}

  async authorizeVoid(
    restaurantId: number,
    managerPin: string,
    orderId: string,
  ) {
    const managers = await this.prismaService.user.findMany({
      where: {
        restaurantId,
        role: EnumRole.OWNER,
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        pinCode: true,
      },
    });

    const comparisons = await Promise.all(
      managers.map(async (manager) => {
        if (!manager.pinCode) return null;
        const isValid = await compare(managerPin, manager.pinCode);
        return isValid ? manager : null;
      }),
    );

    const authorizedManager = comparisons.find((m) => m !== null);

    if (!authorizedManager) {
      throw new UnauthorizedException('errors.manager_authorization_failed');
    }

    const order = await this.prismaService.order.findFirst({
      where: { id: orderId, restaurantId },
      select: { id: true },
    });

    if (!order) {
      throw new NotFoundException('errors.order_not_found');
    }

    await this.prismaService.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.CANCELED,
      },
    });

    return { success: true, voidedBy: authorizedManager.firstName };
  }
}
