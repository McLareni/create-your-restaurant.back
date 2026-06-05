import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDishDto } from './dto/create-dish.dto';
import { BadgeType } from '@prisma/client';

@Injectable()
export class MenuOwnerService {
  constructor(private readonly prisma: PrismaService) {}

  private async verifyRestaurantOwner(restaurantId: number, userId: number) {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: {
        id: restaurantId,
        ownerId: userId,
      },
      select: { id: true },
    });

    if (!restaurant) {
      throw new ForbiddenException('Restaurant not found or access denied');
    }
  }

  async getFullMenu(restaurantId: number, userId: number) {
    await this.verifyRestaurantOwner(restaurantId, userId);

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
                image: {
                  select: {
                    id: true,
                    url: true,
                  },
                },
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
          const { modifiers, images, allergens, tags, ...rest } = dish;
          return {
            ...rest,
            allergens: allergens.map((item) => item.name),
            tags: tags.map((item) => item.name),
            images: images.map(({ image }) => image),
            imageUrl: images[0]?.image.url || null,
            modifierIds: modifiers.map((m) => m.modifierGroupId),
          };
        }),
      })),
    };
  }

  async getTagsLookup(restaurantId: number, userId: number): Promise<string[]> {
    await this.verifyRestaurantOwner(restaurantId, userId);

    const records = await this.prisma.dishTagLookup.findMany({
      where: { restaurantId },
      orderBy: { name: 'asc' },
    });
    return records.map((r) => r.name);
  }

  async getAllergensLookup(
    restaurantId: number,
    userId: number,
  ): Promise<string[]> {
    await this.verifyRestaurantOwner(restaurantId, userId);

    const records = await this.prisma.dishAllergenLookup.findMany({
      where: { restaurantId },
      orderBy: { name: 'asc' },
    });
    return records.map((r) => r.name);
  }

  async createTagLookup(restaurantId: number, name: string, userId: number) {
    await this.verifyRestaurantOwner(restaurantId, userId);

    const existing = await this.prisma.dishTagLookup.findFirst({
      where: { restaurantId, name },
    });
    if (existing) return existing;

    return this.prisma.dishTagLookup.create({
      data: { restaurantId, name },
    });
  }

  async createAllergenLookup(
    restaurantId: number,
    name: string,
    userId: number,
  ) {
    await this.verifyRestaurantOwner(restaurantId, userId);

    const existing = await this.prisma.dishAllergenLookup.findFirst({
      where: { restaurantId, name },
    });
    if (existing) return existing;

    return this.prisma.dishAllergenLookup.create({
      data: { restaurantId, name },
    });
  }

  async deleteTagLookup(restaurantId: number, name: string, userId: number) {
    await this.verifyRestaurantOwner(restaurantId, userId);

    await this.prisma.dishTagLookup.deleteMany({
      where: { restaurantId, name },
    });
    return { success: true };
  }

  async deleteAllergenLookup(
    restaurantId: number,
    name: string,
    userId: number,
  ) {
    await this.verifyRestaurantOwner(restaurantId, userId);

    await this.prisma.dishAllergenLookup.deleteMany({
      where: { restaurantId, name },
    });
    return { success: true };
  }

  async createDish(categoryId: string, dto: CreateDishDto) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) throw new NotFoundException('Category not found');

    const dishCount = await this.prisma.dish.count({ where: { categoryId } });

    return this.prisma.$transaction(async (tx) => {
      const dish = await tx.dish.create({
        data: {
          categoryId,
          name: dto.name,
          description: dto.description || '',
          price: dto.price,
          weight: dto.weight ?? null,
          cookingTime: dto.cookingTime ?? null,
          calories: dto.calories ?? null,
          isVegan: dto.isVegan ?? false,
          isSpicy: dto.isSpicy ?? false,
          isLactoseFree: dto.isLactoseFree ?? false,
          badge: (dto.badge as BadgeType) || BadgeType.NONE,
          allergens: dto.allergens?.length
            ? {
                connectOrCreate: dto.allergens.map((name) => ({
                  where: {
                    restaurantId_name: {
                      restaurantId: category.restaurantId,
                      name,
                    },
                  },
                  create: {
                    restaurantId: category.restaurantId,
                    name,
                  },
                })),
              }
            : undefined,
          tags: dto.tags?.length
            ? {
                connectOrCreate: dto.tags.map((name) => ({
                  where: {
                    restaurantId_name: {
                      restaurantId: category.restaurantId,
                      name,
                    },
                  },
                  create: {
                    restaurantId: category.restaurantId,
                    name,
                  },
                })),
              }
            : undefined,
          isAvailable: dto.isAvailable ?? true,
          sortOrder: dishCount,
        },
      });

      if (dto.ingredients && dto.ingredients.length > 0) {
        await tx.dishIngredient.createMany({
          data: dto.ingredients.map((i) => ({
            dishId: dish.id,
            name: i.name,
            quantity: i.quantity,
            unit: i.unit,
          })),
        });
      }

      if (dto.modifierIds && dto.modifierIds.length > 0) {
        await tx.dishModifier.createMany({
          data: dto.modifierIds.map((modId) => ({
            dishId: dish.id,
            modifierGroupId: modId,
          })),
        });
      }

      return tx.dish.findUnique({
        where: { id: dish.id },
        include: { ingredients: true, allergens: true, tags: true },
      });
    });
  }

  async updateDish(dishId: string, dto: CreateDishDto) {
    const existingDish = await this.prisma.dish.findUnique({
      where: { id: dishId },
    });
    if (!existingDish) throw new NotFoundException('Dish not found');

    return this.prisma.$transaction(async (tx) => {
      await tx.dish.update({
        where: { id: dishId },
        data: {
          name: dto.name,
          description: dto.description,
          price: dto.price,
          weight: dto.weight ?? null,
          cookingTime: dto.cookingTime ?? null,
          calories: dto.calories ?? null,
          isVegan: dto.isVegan,
          isSpicy: dto.isSpicy,
          isLactoseFree: dto.isLactoseFree,
          badge: (dto.badge as BadgeType) || BadgeType.NONE,
          isAvailable: dto.isAvailable,
        },
      });

      await tx.dishIngredient.deleteMany({ where: { dishId } });
      if (dto.ingredients && dto.ingredients.length > 0) {
        await tx.dishIngredient.createMany({
          data: dto.ingredients.map((i) => ({
            dishId,
            name: i.name,
            quantity: i.quantity,
            unit: i.unit,
          })),
        });
      }

      await tx.dishModifier.deleteMany({ where: { dishId } });
      if (dto.modifierIds && dto.modifierIds.length > 0) {
        await tx.dishModifier.createMany({
          data: dto.modifierIds.map((modId) => ({
            dishId,
            modifierGroupId: modId,
          })),
        });
      }

      if (dto.allergens !== undefined || dto.tags !== undefined) {
        const dishWithRestaurant = await tx.dish.findUnique({
          where: { id: dishId },
          select: { category: { select: { restaurantId: true } } },
        });
        const restaurantId = dishWithRestaurant?.category.restaurantId;
        if (!restaurantId) {
          throw new NotFoundException('Dish not found');
        }

        await tx.dish.update({
          where: { id: dishId },
          data: {
            ...(dto.allergens !== undefined && {
              allergens: {
                set: [],
                connectOrCreate: dto.allergens.map((name) => ({
                  where: { restaurantId_name: { restaurantId, name } },
                  create: { restaurantId, name },
                })),
              },
            }),
            ...(dto.tags !== undefined && {
              tags: {
                set: [],
                connectOrCreate: dto.tags.map((name) => ({
                  where: { restaurantId_name: { restaurantId, name } },
                  create: { restaurantId, name },
                })),
              },
            }),
          },
        });
      }

      return tx.dish.findUnique({
        where: { id: dishId },
        include: { ingredients: true, allergens: true, tags: true },
      });
    });
  }
}
