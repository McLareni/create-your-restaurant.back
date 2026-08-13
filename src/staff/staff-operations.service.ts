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
    managerId: number,
    managerPin: string,
    orderId: string,
  ) {
    const manager = await this.prismaService.user.findFirst({
      where: {
        id: managerId,
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

    if (!manager || !manager.pinCode) {
      throw new UnauthorizedException('errors.manager_authorization_failed');
    }

    const isValid = await compare(managerPin, manager.pinCode);

    if (!isValid) {
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

    return {
      message: 'responses.order_voided_successfully',
      voidedBy: manager.firstName,
    };
  }
}
