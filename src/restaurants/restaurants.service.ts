import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class RestaurantsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(createRestaurantDto: CreateRestaurantDto, userId: number) {
    const restaurant = await this.prismaService.restaurant.create({
      data: {
        title: createRestaurantDto.title,
        slug: createRestaurantDto.slug,
        type: createRestaurantDto.type,
        currency: createRestaurantDto.currency,
        phoneNumber: createRestaurantDto.phoneNumber || null,
        city: createRestaurantDto.city || null,
        street: createRestaurantDto.street || null,
        building: createRestaurantDto.building || null,
        workDays: createRestaurantDto.workDays || [
          'mon',
          'tue',
          'wed',
          'thu',
          'fri',
          'sat',
          'sun',
        ],
        workHoursStart: createRestaurantDto.workHoursStart || '10:00',
        workHoursEnd: createRestaurantDto.workHoursEnd || '22:00',
        instagram: createRestaurantDto.instagram || null,
        facebook: createRestaurantDto.facebook || null,
        telegram: createRestaurantDto.telegram || null,
        tiktok: createRestaurantDto.tiktok || null,
        imageUrl: createRestaurantDto.imageUrl || null,
        language: createRestaurantDto.language,
        ownerId: userId,
        purchasedModules: ['menu-engine', 'qr-tables', 'staff'],
        activeModules: ['menu-engine', 'qr-tables', 'staff'],
      },
    });

    return {
      message: 'Restaurant created successfully',
      restaurant,
    };
  }

  async uploadCover(file: any) {
    if (!file) {
      throw new BadRequestException('Photo file is required');
    }
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed');
    }
    const uploaded = await this.cloudinaryService.uploadImage(
      file.buffer,
      'restaurants',
    );
    return { imageUrl: uploaded.secure_url };
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
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const purchased =
      restaurant.purchasedModules && restaurant.purchasedModules.length > 0
        ? restaurant.purchasedModules
        : ['menu-engine', 'qr-tables', 'staff'];

    const active =
      restaurant.activeModules && restaurant.activeModules.length > 0
        ? restaurant.activeModules
        : ['menu-engine', 'qr-tables', 'staff'];

    return {
      purchasedModules: purchased,
      activeModules: active,
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

  async connectModule(restaurantId: number, moduleKey: string, userId: number) {
    const restaurant = await this.prismaService.restaurant.findFirst({
      where: { id: restaurantId, ownerId: userId },
    });
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    const purchased = restaurant.purchasedModules || [
      'menu-engine',
      'qr-tables',
      'staff',
    ];
    const active = restaurant.activeModules || [
      'menu-engine',
      'qr-tables',
      'staff',
    ];

    if (!purchased.includes(moduleKey)) {
      purchased.push(moduleKey);
    }
    if (!active.includes(moduleKey)) {
      active.push(moduleKey);
    }

    await this.prismaService.restaurant.update({
      where: { id: restaurantId },
      data: {
        purchasedModules: purchased,
        activeModules: active,
      },
    });

    return { success: true };
  }

  async toggleModule(
    restaurantId: number,
    moduleKey: string,
    isActive: boolean,
    userId: number,
  ) {
    const restaurant = await this.prismaService.restaurant.findFirst({
      where: { id: restaurantId, ownerId: userId },
    });
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    let active = restaurant.activeModules || [
      'menu-engine',
      'qr-tables',
      'staff',
    ];

    if (isActive) {
      if (!active.includes(moduleKey)) {
        active.push(moduleKey);
      }
    } else {
      active = active.filter((key) => key !== moduleKey);
    }

    await this.prismaService.restaurant.update({
      where: { id: restaurantId },
      data: { activeModules: active },
    });

    return { success: true };
  }
}
