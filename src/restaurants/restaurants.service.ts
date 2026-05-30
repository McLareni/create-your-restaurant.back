import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';

@Injectable()
export class RestaurantsService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createRestaurantDto: CreateRestaurantDto, userId: number) {
    const restaurant = await this.prismaService.restaurant.create({
      data: {
        title: createRestaurantDto.title,
        slug: createRestaurantDto.slug,
        type: createRestaurantDto.type,
        currency: createRestaurantDto.currency,
        phoneNumber: createRestaurantDto.phoneNumber || null,
        city: createRestaurantDto.city || null,
        language: createRestaurantDto.language,
        ownerId: userId,
      },
    });

    return {
      message: 'Restaurant created successfully',
      restaurant,
    };
  }

  async checkSlug(slug: string) {
    const existingRestaurant = await this.prismaService.restaurant.findUnique({
      where: { slug },
    });
    return { isAvailable: !existingRestaurant };
  }

  async getAccess(restaurantId: number, userId: number) {
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

    return {
      purchasedModules: ['menu-engine', 'qr-tables', 'staff'],
      activeModules: ['menu-engine', 'qr-tables', 'staff'],
      permissions: ['menu:read', 'menu:edit', 'staff:view'],
    };
  }

  async delete(restaurantId: number, userId: number) {
    const restaurant = await this.prismaService.restaurant.findFirst({
      where: {
        id: restaurantId,
        ownerId: userId,
      },
      select: { id: true },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found or access denied');
    }

    await this.prismaService.restaurant.delete({
      where: { id: restaurantId },
    });

    return {
      message: 'Restaurant deleted successfully',
    };
  }
}