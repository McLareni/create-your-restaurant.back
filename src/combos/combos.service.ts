import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateComboDto } from './dto/create-combo.dto';
import { UpdateComboDto } from './dto/update-combo.dto';

@Injectable()
export class CombosService {
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
    return this.prisma.combo.findMany({
      where: { restaurantId },
      include: {
        dishes: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(restaurantId: number, dto: CreateComboDto, userId: number) {
    await this.checkAccess(restaurantId, userId);

    return this.prisma.$transaction(async (tx) => {
      return tx.combo.create({
        data: {
          restaurantId,
          name: dto.name,
          priceType: dto.priceType,
          priceValue: dto.priceValue,
          dishes: {
            create: dto.dishes.map((d) => ({
              dishId: d.id,
              name: d.name,
              price: d.price,
            })),
          },
        },
        include: {
          dishes: true,
        },
      });
    });
  }

  async update(
    restaurantId: number,
    id: string,
    dto: UpdateComboDto,
    userId: number,
  ) {
    await this.checkAccess(restaurantId, userId);

    const combo = await this.prisma.combo.findFirst({
      where: { id, restaurantId },
    });
    if (!combo) throw new NotFoundException('Combo pack not found');

    return this.prisma.$transaction(async (tx) => {
      if (dto.dishes) {
        await tx.comboDish.deleteMany({ where: { comboId: id } });
      }

      return tx.combo.update({
        where: { id },
        data: {
          name: dto.name,
          priceType: dto.priceType,
          priceValue: dto.priceValue,
          ...(dto.dishes && {
            dishes: {
              create: dto.dishes.map((d) => ({
                dishId: d.id,
                name: d.name,
                price: d.price,
              })),
            },
          }),
        },
        include: {
          dishes: true,
        },
      });
    });
  }

  async delete(restaurantId: number, id: string, userId: number) {
    await this.checkAccess(restaurantId, userId);

    const combo = await this.prisma.combo.findFirst({
      where: { id, restaurantId },
    });
    if (!combo) throw new NotFoundException('Combo pack not found');

    await this.prisma.combo.delete({ where: { id } });
    return { message: 'Combo pack deleted successfully' };
  }
}
