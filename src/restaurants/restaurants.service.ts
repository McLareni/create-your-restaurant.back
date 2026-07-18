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
    const existingRestaurants = await this.prismaService.restaurant.findMany({
      where: { ownerId: userId },
      select: { activeModules: true },
    });
    const hasMultiRestaurantModule = existingRestaurants.some((r) =>
      r.activeModules.includes('multi-restaurant'),
    );
    const maxAllowed = hasMultiRestaurantModule ? 3 : 1;
    if (existingRestaurants.length >= maxAllowed) {
      throw new BadRequestException(
        hasMultiRestaurantModule
          ? 'Maximum limit of 3 restaurants reached.'
          : 'Default limit is 1 restaurant. Activate Multi-Restaurant module.',
      );
    }
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
    return { message: 'Restaurant created successfully', restaurant };
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
    const allUserRestaurants = await this.prismaService.restaurant.findMany({
      where: { ownerId: userId },
      select: { id: true, purchasedModules: true, activeModules: true },
    });
    const currentRestaurant = allUserRestaurants.find(
      (r) => r.id === restaurantId,
    );
    if (!currentRestaurant) {
      throw new NotFoundException('Restaurant not found');
    }
    const mainRestaurant = allUserRestaurants.find((r) =>
      r.purchasedModules.includes('multi-restaurant'),
    );
    const mainRestaurantId = mainRestaurant ? mainRestaurant.id : null;

    const globalPurchasedHasMulti = allUserRestaurants.some((r) =>
      r.purchasedModules.includes('multi-restaurant'),
    );
    const globalActiveHasMulti = allUserRestaurants.some((r) =>
      r.activeModules.includes('multi-restaurant'),
    );
    const purchased =
      currentRestaurant.purchasedModules &&
      currentRestaurant.purchasedModules.length > 0
        ? [...currentRestaurant.purchasedModules]
        : ['menu-engine', 'qr-tables', 'staff'];
    const active =
      currentRestaurant.activeModules &&
      currentRestaurant.activeModules.length > 0
        ? [...currentRestaurant.activeModules]
        : ['menu-engine', 'qr-tables', 'staff'];
    const isMainForMultiRestaurant =
      currentRestaurant.purchasedModules.includes('multi-restaurant');
    if (globalPurchasedHasMulti && !purchased.includes('multi-restaurant')) {
      purchased.push('multi-restaurant');
    }
    if (globalActiveHasMulti && !active.includes('multi-restaurant')) {
      active.push('multi-restaurant');
    }
    return {
      purchasedModules: purchased,
      activeModules: active,
      permissions: ['menu:read', 'menu:edit', 'staff:view'],
      isMainForMultiRestaurant,
      mainRestaurantId,
    };
  }

  async delete(restaurantId: number, userId: number) {
    const restaurant = await this.prismaService.restaurant.findFirst({
      where: { id: restaurantId, ownerId: userId },
      select: { id: true },
    });
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found or access denied');
    }
    await this.prismaService.restaurant.delete({
      where: { id: restaurantId },
    });
    return { message: 'Restaurant deleted successfully' };
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
      data: { purchasedModules: purchased, activeModules: active },
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

    if (moduleKey === 'multi-restaurant') {
      const allUserRestaurants = await this.prismaService.restaurant.findMany({
        where: { ownerId: userId },
      });
      const mainRestaurant = allUserRestaurants.find((r) =>
        r.purchasedModules.includes('multi-restaurant'),
      );
      if (!mainRestaurant) {
        throw new BadRequestException(
          'License error: Module must be purchased first.',
        );
      }
      for (const res of allUserRestaurants) {
        let resActive = res.activeModules || [
          'menu-engine',
          'qr-tables',
          'staff',
        ];
        if (isActive) {
          if (!resActive.includes('multi-restaurant')) {
            resActive.push('multi-restaurant');
          }
        } else {
          resActive = resActive.filter((key) => key !== 'multi-restaurant');
        }
        await this.prismaService.restaurant.update({
          where: { id: res.id },
          data: { activeModules: resActive },
        });
      }
      return { success: true };
    }

    const purchased = restaurant.purchasedModules || [
      'menu-engine',
      'qr-tables',
      'staff',
    ];
    if (isActive && !purchased.includes(moduleKey)) {
      throw new BadRequestException(
        'License error: Module must be purchased first.',
      );
    }
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
