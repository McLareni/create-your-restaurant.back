import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BadgeType } from '@prisma/client';
import { PosAdapterFactory } from 'src/pos/adapters/pos.adapter';

@Injectable()
export class PosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adapterFactory: PosAdapterFactory,
  ) {}

  async getStatus(restaurantId: number) {
    const posSettings = await this.prisma.posIntegration.findUnique({
      where: { restaurantId },
    });
    if (!posSettings) {
      return {
        isConnected: false,
        importMenu: false,
        syncStops: false,
        maskedApiKey: null,
      };
    }
    let maskedApiKey: string | null = null;
    if (posSettings.apiKey) {
      const key = posSettings.apiKey;
      if (key.length > 8) {
        const prefix = key.substring(0, 8);
        const suffix = key.substring(key.length - 4);
        maskedApiKey = `${prefix}_***_${suffix}`;
      } else {
        maskedApiKey = '***';
      }
    }
    return {
      isConnected: true,
      importMenu: posSettings.importMenu,
      syncStops: posSettings.syncStops,
      maskedApiKey,
    };
  }

  async connect(restaurantId: number, dto: { apiKey: string }) {
    return await this.prisma.posIntegration.upsert({
      where: { restaurantId },
      update: { apiKey: dto.apiKey },
      create: {
        restaurantId,
        apiKey: dto.apiKey,
        provider: 'POSTER',
        importMenu: true,
        syncStops: true,
      },
    });
  }

  async updateSettings(
    restaurantId: number,
    dto: { importMenu?: boolean; syncStops?: boolean },
  ) {
    return await this.prisma.posIntegration.update({
      where: { restaurantId },
      data: {
        importMenu: dto.importMenu,
        syncStops: dto.syncStops,
      },
    });
  }

  async syncMenu(restaurantId: number) {
    const posSettings = await this.prisma.posIntegration.findUnique({
      where: { restaurantId },
    });
    if (!posSettings || !posSettings.apiKey) {
      throw new BadRequestException('errors.pos_not_configured');
    }
    const adapter = this.adapterFactory.getAdapter(posSettings.provider);
    const externalMenu = await adapter.fetchMenu(posSettings.apiKey);
    return await this.prisma.$transaction(async (tx) => {
      let categoriesCreated = 0;
      let dishesCreated = 0;
      const existingCategories = await tx.category.findMany({
        where: { restaurantId },
        include: {
          dishes: {
            select: { name: true },
          },
        },
      });
      const categoryMap = new Map(existingCategories.map((c) => [c.name, c]));
      for (const cat of externalMenu) {
        let category = categoryMap.get(cat.category_name);
        if (!category) {
          const currentCount = categoryMap.size;
          category = await tx.category.create({
            data: {
              restaurantId,
              name: cat.category_name,
              sortOrder: currentCount,
            },
            include: { dishes: true },
          });
          categoryMap.set(cat.category_name, category);
          categoriesCreated++;
        }
        const existingDishNames = new Set(
          category.dishes?.map((d) => d.name) || [],
        );
        const newDishesData = cat.dishes
          .filter((d) => !existingDishNames.has(d.name))
          .map((d, index) => ({
            categoryId: category.id,
            name: d.name,
            description: d.description,
            price: d.price,
            weight: d.weight ?? null,
            cookingTime: d.cookingTime ?? null,
            calories: d.calories ?? null,
            isAvailable: true,
            sortOrder: existingDishNames.size + index,
            badge: BadgeType.NONE,
          }));
        if (newDishesData.length > 0) {
          await tx.dish.createMany({
            data: newDishesData,
          });
          dishesCreated += newDishesData.length;
        }
      }
      return {
        success: true,
        categoriesCreated,
        dishesCreated,
      };
    });
  }

  async disconnect(restaurantId: number) {
    const posSettings = await this.prisma.posIntegration.findUnique({
      where: { restaurantId },
    });
    if (!posSettings) {
      throw new BadRequestException('errors.pos_not_configured');
    }
    await this.prisma.posIntegration.delete({
      where: { restaurantId },
    });
    return { success: true };
  }
}
