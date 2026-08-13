import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateVisualDto } from './dto/update-visual.dto';

@Injectable()
export class VisualService {
  constructor(private readonly prisma: PrismaService) {}

  async getVisualSettings(restaurantId: number) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { visualSettings: true },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    return restaurant.visualSettings || {};
  }

  async updateVisualSettings(restaurantId: number, updateDto: UpdateVisualDto) {
    const currentSettings = await this.getVisualSettings(restaurantId);

    const newSettings = {
      ...(typeof currentSettings === 'object' && currentSettings !== null
        ? currentSettings
        : {}),
      ...updateDto,
    };

    const restaurant = await this.prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        visualSettings: newSettings,
      },
      select: { visualSettings: true },
    });

    return restaurant.visualSettings;
  }
}
