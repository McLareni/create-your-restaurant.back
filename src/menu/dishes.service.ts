import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDishDto } from './dto/create-dish.dto';
import { UpdateDishDto } from './dto/update-dish.dto';
import { ReorderDishesDto } from './dto/reorder-dishes.dto';
import { BadgeType, Prisma } from '@prisma/client';

type UploadedDishImage = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

@Injectable()
export class DishesService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  private async attachDishImage(
    tx: Prisma.TransactionClient,
    dishId: string,
    file: UploadedDishImage,
  ) {
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed');
    }

    const uploaded = await this.cloudinaryService.uploadImage(
      file.buffer,
      'dishes',
    );

    await tx.image.create({
      data: {
        url: uploaded.secure_url,
        imageDishes: {
          create: {
            dishId,
          },
        },
      },
    });
  }

  async getTagsLookup() {
    const defaultTags = [
      'Веган',
      'Гостро',
      'Без лактози',
      'Біо',
      'Фітнес',
      'Шеф-рецепт',
    ];
    const lookups = await this.prismaService.dishTagLookup.findMany({
      select: { name: true },
    });
    const usedTags = lookups.map((item) => item.name);
    return Array.from(new Set([...defaultTags, ...usedTags]));
  }

  async getAllergensLookup() {
    const defaultAllergens = [
      'Глютен',
      'Лактоза',
      'Горіхи',
      'Морепродукти',
      'Арахіс',
      'Яйця',
    ];
    const lookups = await this.prismaService.dishAllergenLookup.findMany({
      select: { name: true },
    });
    const usedAllergens = lookups.map((item) => item.name);
    return Array.from(new Set([...defaultAllergens, ...usedAllergens]));
  }

  async deleteTagLookup(tagName: string, userId: number) {
    await this.prismaService.dishTagLookup.deleteMany({
      where: {
        name: tagName,
        restaurant: { ownerId: userId },
      },
    });
    return { message: 'Tag removed from all dishes successfully' };
  }

  async deleteAllergenLookup(allergenName: string, userId: number) {
    await this.prismaService.dishAllergenLookup.deleteMany({
      where: {
        name: allergenName,
        restaurant: { ownerId: userId },
      },
    });
    return { message: 'Allergen removed from all dishes successfully' };
  }

  async createDish(
    categoryId: string,
    createDishDto: CreateDishDto,
    userId: number,
    file?: UploadedDishImage,
  ) {
    const category = await this.prismaService.category.findFirst({
      where: { id: categoryId, restaurant: { ownerId: userId } },
      select: { id: true, restaurantId: true },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const { ingredients, modifierIds, ...dishData } = createDishDto;
    const dishCount = await this.prismaService.dish.count({
      where: { categoryId },
    });

    return this.prismaService.$transaction(async (tx) => {
      const dish = await tx.dish.create({
        data: {
          categoryId,
          name: dishData.name,
          description: dishData.description || '',
          price: dishData.price,
          weight: dishData.weight ?? null,
          cookingTime: dishData.cookingTime ?? null,
          calories: dishData.calories ?? null,
          isVegan: dishData.isVegan ?? false,
          isSpicy: dishData.isSpicy ?? false,
          isLactoseFree: dishData.isLactoseFree ?? false,
          badge: (dishData.badge as BadgeType) || BadgeType.NONE,
          isAvailable: dishData.isAvailable ?? true,
          sortOrder: dishCount,
          allergens: dishData.allergens?.length
            ? {
                connectOrCreate: dishData.allergens.map((name) => ({
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
          tags: dishData.tags?.length
            ? {
                connectOrCreate: dishData.tags.map((name) => ({
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
        },
      });

      if (ingredients && ingredients.length > 0) {
        await tx.dishIngredient.createMany({
          data: ingredients.map((i) => ({
            dishId: dish.id,
            name: i.name,
            quantity: i.quantity,
            unit: i.unit,
            inventoryItemId: i.inventoryItemId || null, // <--- ЗАПИСУЄМО ЗВ'ЯЗОК З СКЛАДОМ
          })),
        });
      }

      if (modifierIds && modifierIds.length > 0) {
        await tx.dishModifier.createMany({
          data: modifierIds.map((modId) => ({
            dishId: dish.id,
            modifierGroupId: modId,
          })),
        });
      }

      if (file) {
        await this.attachDishImage(tx, dish.id, file);
      }

      return tx.dish.findUnique({
        where: { id: dish.id },
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
        },
      });
    });
  }

  async updateDish(
    dishId: string,
    updateDishDto: UpdateDishDto,
    userId: number,
    file?: UploadedDishImage,
  ) {
    const dish = await this.prismaService.dish.findFirst({
      where: { id: dishId, category: { restaurant: { ownerId: userId } } },
      select: { id: true },
    });

    if (!dish) {
      throw new NotFoundException('Dish not found');
    }

    const { ingredients, modifierIds, categoryId, sortOrder, ...dishData } =
      updateDishDto;

    const isBadgeType = (value: string): value is BadgeType =>
      Object.values(BadgeType).includes(value as BadgeType);

    const badgeValue: BadgeType | undefined =
      dishData.badge && isBadgeType(dishData.badge)
        ? dishData.badge
        : undefined;

    const dishUpdateData: Prisma.DishUpdateInput = {
      ...(dishData.name !== undefined && { name: dishData.name }),
      ...(dishData.description !== undefined && {
        description: dishData.description,
      }),
      ...(dishData.price !== undefined && { price: dishData.price }),
      ...(dishData.weight !== undefined && { weight: dishData.weight }),
      ...(dishData.cookingTime !== undefined && {
        cookingTime: dishData.cookingTime,
      }),
      ...(dishData.calories !== undefined && { calories: dishData.calories }),
      ...(dishData.isVegan !== undefined && { isVegan: dishData.isVegan }),
      ...(dishData.isSpicy !== undefined && { isSpicy: dishData.isSpicy }),
      ...(dishData.isLactoseFree !== undefined && {
        isLactoseFree: dishData.isLactoseFree,
      }),
      ...(badgeValue !== undefined && { badge: badgeValue }),
      ...(dishData.isAvailable !== undefined && {
        isAvailable: dishData.isAvailable,
      }),
      ...(categoryId !== undefined && { categoryId }),
      ...(sortOrder !== undefined && { sortOrder }),
      ...(ingredients !== undefined && {
        ingredients: { create: ingredients },
      }),
    };

    return this.prismaService.$transaction(async (tx) => {
      const existingDish = await tx.dish.findUnique({
        where: { id: dishId },
        select: { category: { select: { restaurantId: true } } },
      });
      const restaurantId = existingDish?.category.restaurantId;
      if (!restaurantId) {
        throw new NotFoundException('Dish not found');
      }

      if (ingredients) {
        await tx.dishIngredient.deleteMany({ where: { dishId } });
      }

      if (modifierIds !== undefined) {
        await tx.dishModifier.deleteMany({ where: { dishId } });
      }

      if (dishData.allergens !== undefined) {
        dishUpdateData.allergens = {
          set: [],
          connectOrCreate: dishData.allergens.map((name) => ({
            where: {
              restaurantId_name: { restaurantId, name },
            },
            create: { restaurantId, name },
          })),
        };
      }

      if (dishData.tags !== undefined) {
        dishUpdateData.tags = {
          set: [],
          connectOrCreate: dishData.tags.map((name) => ({
            where: {
              restaurantId_name: { restaurantId, name },
            },
            create: { restaurantId, name },
          })),
        };
      }

      const updatedDish = await tx.dish.update({
        where: { id: dishId },
        data: dishUpdateData,
        include: { ingredients: true, allergens: true, tags: true },
      });

      if (modifierIds && modifierIds.length > 0) {
        await tx.dishModifier.createMany({
          data: modifierIds.map((modId) => ({
            dishId,
            modifierGroupId: modId,
          })),
        });
      }

      if (file) {
        await this.attachDishImage(tx, dishId, file);
      }

      return updatedDish;
    });
  }

  async reorderDishes(reorderDishesDto: ReorderDishesDto, userId: number) {
    const dishIds = reorderDishesDto.items.map((i) => i.id);

    const dishes = await this.prismaService.dish.findMany({
      where: {
        id: { in: dishIds },
        category: { restaurant: { ownerId: userId } },
      },
      select: { id: true },
    });

    if (dishes.length !== dishIds.length) {
      throw new NotFoundException('Some dishes not found or access denied');
    }

    await this.prismaService.$transaction(
      reorderDishesDto.items.map((item) =>
        this.prismaService.dish.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );

    return { message: 'Dishes reordered successfully' };
  }

  async deleteDish(dishId: string, userId: number) {
    const dish = await this.prismaService.dish.findFirst({
      where: { id: dishId, category: { restaurant: { ownerId: userId } } },
      select: { id: true },
    });

    if (!dish) throw new NotFoundException('Dish not found');

    await this.prismaService.dish.delete({ where: { id: dishId } });

    return { message: 'Dish deleted successfully' };
  }
}
