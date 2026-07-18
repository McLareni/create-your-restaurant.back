import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BadgeType } from '@prisma/client';

export interface PosMenuDish {
  name: string;
  price: number;
  description: string;
  weight?: number | null;
  cookingTime?: number | null;
  calories?: number | null;
}

export interface PosMenuCategory {
  category_name: string;
  dishes: PosMenuDish[];
}

export interface PosAdapter {
  fetchMenu(apiKey: string): Promise<PosMenuCategory[]>;
}

@Injectable()
export class PosterAdapter implements PosAdapter {
  fetchMenu(apiKey: string): Promise<PosMenuCategory[]> {
    if (!apiKey) {
      throw new BadRequestException('pos.errors.invalidApiKey');
    }
    return Promise.resolve([
      {
        category_name: 'Піца з печі',
        dishes: [
          {
            name: 'Піца Маргарита',
            price: 195,
            description: 'Класична піца з томатами та моцарелою',
            weight: 400,
            cookingTime: 12,
            calories: 750,
          },
          {
            name: 'Піца Чотири Сири',
            price: 245,
            description: 'Моцарела, пармезан, дорблю, чеддер',
            weight: 420,
            cookingTime: 15,
            calories: 920,
          },
        ],
      },
      {
        category_name: 'Фірмові напої',
        dishes: [
          {
            name: 'Лимонад Класичний',
            price: 65,
            description: 'Свіжий лимонний сік, м’ята, газована вода',
            weight: 350,
            cookingTime: 3,
            calories: 120,
          },
          {
            name: 'Капучино',
            price: 55,
            description: 'Еспресо з ніжним збитим молоком',
            weight: 250,
            cookingTime: 4,
            calories: 150,
          },
        ],
      },
    ]);
  }
}

@Injectable()
export class PosAdapterFactory {
  constructor(private readonly posterAdapter: PosterAdapter) {}

  getAdapter(provider: string): PosAdapter {
    switch (provider.toUpperCase()) {
      case 'POSTER':
        return this.posterAdapter;
      default:
        throw new BadRequestException('pos.errors.unsupportedProvider');
    }
  }
}

@Injectable()
export class PosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adapterFactory: PosAdapterFactory,
  ) {}

  async getStatus(restaurantId: number, userId: number) {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: { id: restaurantId, ownerId: userId },
    });
    if (!restaurant) {
      throw new BadRequestException('pos.errors.accessDenied');
    }

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

  async connect(restaurantId: number, dto: { apiKey: string }, userId: number) {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: { id: restaurantId, ownerId: userId },
    });
    if (!restaurant) {
      throw new BadRequestException('pos.errors.accessDenied');
    }

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
    userId: number,
  ) {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: { id: restaurantId, ownerId: userId },
    });
    if (!restaurant) {
      throw new BadRequestException('pos.errors.accessDenied');
    }

    return await this.prisma.posIntegration.update({
      where: { restaurantId },
      data: dto,
    });
  }

  async syncMenu(restaurantId: number, userId: number) {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: { id: restaurantId, ownerId: userId },
    });
    if (!restaurant) {
      throw new BadRequestException('pos.errors.accessDenied');
    }

    const posSettings = await this.prisma.posIntegration.findUnique({
      where: { restaurantId },
    });
    if (!posSettings || !posSettings.apiKey) {
      throw new BadRequestException('POS integration not configured');
    }

    const adapter = this.adapterFactory.getAdapter(posSettings.provider);
    const externalMenu = await adapter.fetchMenu(posSettings.apiKey);

    let categoriesCreated = 0;
    let dishesCreated = 0;

    const existingCategories = await this.prisma.category.findMany({
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
        category = await this.prisma.category.create({
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
        await this.prisma.dish.createMany({
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
  }
}
