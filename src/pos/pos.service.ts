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

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

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

    const categoryChunks = this.chunkArray<PosMenuCategory>(externalMenu, 50);
    for (const chunk of categoryChunks) {
      await this.prisma.$transaction(async (tx) => {
        for (const cat of chunk) {
          let existingCategory = await tx.category.findFirst({
            where: { restaurantId, name: cat.category_name },
          });

          if (!existingCategory) {
            const categoryCount = await tx.category.count({
              where: { restaurantId },
            });
            existingCategory = await tx.category.create({
              data: {
                restaurantId,
                name: cat.category_name,
                sortOrder: categoryCount,
              },
            });
            categoriesCreated++;
          }

          const dishChunks = this.chunkArray<PosMenuDish>(cat.dishes, 100);
          for (const dishChunk of dishChunks) {
            for (const dish of dishChunk) {
              const existingDish = await tx.dish.findFirst({
                where: { categoryId: existingCategory.id, name: dish.name },
              });

              if (!existingDish) {
                const dishCount = await tx.dish.count({
                  where: { categoryId: existingCategory.id },
                });
                await tx.dish.create({
                  data: {
                    categoryId: existingCategory.id,
                    name: dish.name,
                    description: dish.description,
                    price: dish.price,
                    weight: dish.weight,
                    cookingTime: dish.cookingTime,
                    calories: dish.calories,
                    isAvailable: true,
                    sortOrder: dishCount,
                    badge: BadgeType.NONE,
                    taxRate: 20,
                  },
                });
                dishesCreated++;
              }
            }
          }
        }
      });

      await new Promise((resolve) => setImmediate(resolve));
    }

    return {
      success: true,
      categoriesCreated,
      dishesCreated,
    };
  }
}
