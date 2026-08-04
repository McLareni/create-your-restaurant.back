import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { DataMappingUtil } from 'src/common/utils/mapping.util';

@Injectable()
export class MenuOwnerService {
  constructor(private readonly prisma: PrismaService) {}

  async getFullMenu(restaurantId: number) {
    const categories = await this.prisma.category.findMany({
      where: { restaurantId },
      orderBy: { sortOrder: 'asc' },
      include: {
        dishes: {
          orderBy: { sortOrder: 'asc' },
          include: {
            ingredients: true,
            allergens: true,
            tags: true,
            images: {
              include: {
                image: true,
              },
            },
            modifiers: {
              select: { modifierGroupId: true },
            },
          },
        },
      },
    });

    return {
      restaurantId,
      categories: categories.map((cat) => ({
        ...cat,
        dishes: cat.dishes.map((dish) => {
          const mappedDish = DataMappingUtil.mapDishImages(dish);

          return {
            ...mappedDish,
            allergens: dish.allergens.map((item) => item.name),
            tags: dish.tags.map((item) => item.name),
            modifierIds: dish.modifiers.map((m) => m.modifierGroupId),
          };
        }),
      })),
    };
  }

  async getTagsLookup(restaurantId: number): Promise<string[]> {
    const records = await this.prisma.dishTagLookup.findMany({
      where: { restaurantId },
      orderBy: { name: 'asc' },
    });
    return records.map((r) => r.name);
  }

  async getAllergensLookup(restaurantId: number): Promise<string[]> {
    const records = await this.prisma.dishAllergenLookup.findMany({
      where: { restaurantId },
      orderBy: { name: 'asc' },
    });
    return records.map((r) => r.name);
  }

  async createTagLookup(restaurantId: number, name: string) {
    const existing = await this.prisma.dishTagLookup.findFirst({
      where: { restaurantId, name },
    });
    if (existing) return existing;
    return this.prisma.dishTagLookup.create({
      data: { restaurantId, name },
    });
  }

  async createAllergenLookup(restaurantId: number, name: string) {
    const existing = await this.prisma.dishAllergenLookup.findFirst({
      where: { restaurantId, name },
    });
    if (existing) return existing;
    return this.prisma.dishAllergenLookup.create({
      data: { restaurantId, name },
    });
  }

  async deleteTagLookup(restaurantId: number, name: string) {
    await this.prisma.dishTagLookup.deleteMany({
      where: { restaurantId, name },
    });
    return { success: true };
  }

  async deleteAllergenLookup(restaurantId: number, name: string) {
    await this.prisma.dishAllergenLookup.deleteMany({
      where: { restaurantId, name },
    });
    return { success: true };
  }
}
