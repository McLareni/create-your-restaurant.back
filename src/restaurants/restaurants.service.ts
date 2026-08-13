import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { PERMISSIONS } from 'src/common/constants/permissions.constants';
import { MODULE_CATALOG } from 'src/common/constants/modules.constants';
import type { CreateRestaurantDto } from 'src/restaurants/dto/create-restaurant.dto';
import type { UploadedStaffImage } from 'src/cloudinary/cloudinary.service';

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
          ? 'errors.restaurant_limit_reached_max'
          : 'errors.restaurant_limit_reached_default',
      );
    }

    const currentCount = existingRestaurants.length;

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
        sortOrder: currentCount,
        purchasedModules: ['menu-engine', 'qr-tables', 'staff'],
        activeModules: ['menu-engine', 'qr-tables', 'staff'],
      },
    });

    return { message: 'success.restaurant_created', restaurant };
  }

  async reorder(ids: number[], userId: number) {
    await this.prismaService.$transaction(
      ids.map((id, index) =>
        this.prismaService.restaurant.updateMany({
          where: { id, ownerId: userId },
          data: { sortOrder: index },
        }),
      ),
    );
    return { message: 'success.restaurants_reordered' };
  }

  async uploadCover(file: UploadedStaffImage) {
    if (!file) {
      throw new BadRequestException('errors.photo_required');
    }
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('errors.invalid_file_type');
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
      select: { id: true },
    });
    return { isAvailable: !existingRestaurant };
  }

  async getAccess(restaurantId: number, userId: number) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, restaurantId: true, customRole: true },
    });

    if (!user) {
      throw new NotFoundException('errors.user_not_found');
    }

    const restaurant = await this.prismaService.restaurant.findUnique({
      where: { id: restaurantId },
      select: { ownerId: true, purchasedModules: true, activeModules: true },
    });

    if (!restaurant) {
      throw new NotFoundException('errors.restaurant_not_found');
    }

    const isOwner = restaurant.ownerId === user.id;
    const isStaff = user.restaurantId === restaurantId && user.role === 'STAFF';

    if (!isOwner && !isStaff) {
      throw new BadRequestException('errors.access_denied');
    }

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

    let permissions: string[] = [];

    if (isOwner) {
      permissions = Object.values(PERMISSIONS);
    } else if (isStaff && user.customRole) {
      const staffRole = await this.prismaService.staffRole.findFirst({
        where: { restaurantId, name: user.customRole },
        select: { permissions: true },
      });
      permissions = staffRole ? staffRole.permissions : [];
    }

    const allOwnerRestaurants = await this.prismaService.restaurant.findMany({
      where: { ownerId: restaurant.ownerId },
      select: { id: true, purchasedModules: true, activeModules: true },
    });

    const mainRestaurant = allOwnerRestaurants.find((r) =>
      r.purchasedModules.includes('multi-restaurant'),
    );
    const mainRestaurantId = mainRestaurant ? mainRestaurant.id : null;

    const globalPurchasedHasMulti = allOwnerRestaurants.some((r) =>
      r.purchasedModules.includes('multi-restaurant'),
    );
    const globalActiveHasMulti = allOwnerRestaurants.some((r) =>
      r.activeModules.includes('multi-restaurant'),
    );

    if (globalPurchasedHasMulti && !purchased.includes('multi-restaurant')) {
      purchased.push('multi-restaurant');
    }
    if (globalActiveHasMulti && !active.includes('multi-restaurant')) {
      active.push('multi-restaurant');
    }

    return {
      purchasedModules: purchased,
      activeModules: active,
      permissions,
      isMainForMultiRestaurant:
        restaurant.purchasedModules.includes('multi-restaurant'),
      mainRestaurantId,
    };
  }

  async delete(restaurantId: number, userId: number) {
    const restaurant = await this.prismaService.restaurant.findFirst({
      where: { id: restaurantId, ownerId: userId },
      select: { id: true },
    });

    if (!restaurant) {
      throw new NotFoundException('errors.restaurant_not_found');
    }

    await this.prismaService.restaurant.delete({
      where: { id: restaurantId },
    });

    return { message: 'success.restaurant_deleted' };
  }

  async connectModule(
    restaurantId: number,
    moduleKey: string,
    activationCode: string | undefined,
    userId: number,
  ) {
    const moduleInfo = MODULE_CATALOG.find((m) => m.key === moduleKey);
    if (!moduleInfo) {
      throw new BadRequestException('errors.invalid_module_key');
    }

    if (moduleInfo.price > 0) {
      if (!activationCode || activationCode.trim() !== 'GUSTIO-2026') {
        throw new BadRequestException('errors.invalid_activation_code');
      }
    }

    if (moduleKey === 'multi-restaurant') {
      const allUserRestaurants = await this.prismaService.restaurant.findMany({
        where: { ownerId: userId },
        select: { id: true, purchasedModules: true },
      });

      const alreadyPurchased = allUserRestaurants.some((r) =>
        r.purchasedModules.includes('multi-restaurant'),
      );
      if (alreadyPurchased) {
        throw new BadRequestException('errors.module_already_purchased');
      }
    }

    const restaurant = await this.prismaService.restaurant.findFirst({
      where: { id: restaurantId, ownerId: userId },
      select: { id: true, purchasedModules: true, activeModules: true },
    });

    if (!restaurant) {
      throw new NotFoundException('errors.restaurant_not_found');
    }

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

    return { message: 'success.module_connected' };
  }

  async toggleModule(
    restaurantId: number,
    moduleKey: string,
    isActive: boolean,
    userId: number,
  ) {
    const restaurant = await this.prismaService.restaurant.findFirst({
      where: { id: restaurantId, ownerId: userId },
      select: { id: true, purchasedModules: true, activeModules: true },
    });

    if (!restaurant) {
      throw new NotFoundException('errors.restaurant_not_found');
    }

    const moduleInfo = MODULE_CATALOG.find((m) => m.key === moduleKey);
    if (!moduleInfo) {
      throw new BadRequestException('errors.invalid_module_key');
    }

    if (moduleKey === 'multi-restaurant') {
      const allUserRestaurants = await this.prismaService.restaurant.findMany({
        where: { ownerId: userId },
        select: { id: true, purchasedModules: true, activeModules: true },
      });

      const mainRestaurant = allUserRestaurants.find((r) =>
        r.purchasedModules.includes('multi-restaurant'),
      );

      if (!mainRestaurant) {
        throw new BadRequestException('errors.module_not_purchased');
      }

      if (restaurantId !== mainRestaurant.id) {
        throw new BadRequestException('errors.only_main_can_toggle_multi');
      }

      await this.prismaService.$transaction(
        allUserRestaurants.map((res) => {
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

          return this.prismaService.restaurant.update({
            where: { id: res.id },
            data: { activeModules: resActive },
          });
        }),
      );

      return { message: 'success.module_toggled' };
    }

    const purchased = restaurant.purchasedModules || [
      'menu-engine',
      'qr-tables',
      'staff',
    ];

    if (isActive && !purchased.includes(moduleKey)) {
      throw new BadRequestException('errors.module_not_purchased');
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

    return { message: 'success.module_toggled' };
  }
}
