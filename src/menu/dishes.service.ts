import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDishDto } from './dto/create-dish.dto';
import { UpdateDishDto } from './dto/update-dish.dto';
import { ReorderDishesDto } from './dto/reorder-dishes.dto';
import { BadgeType } from '@prisma/client';

@Injectable()
export class DishesService {
  constructor(private readonly prismaService: PrismaService) {}

  async getTagsLookup() {
    const defaultTags = ['Веган', 'Гостро', 'Без лактози', 'Біо', 'Фітнес', 'Шеф-рецепт'];
    const dishes = await this.prismaService.dish.findMany({ select: { tags: true } });
    const usedTags = Array.from(new Set(dishes.flatMap(d => d.tags)));
    return Array.from(new Set([...defaultTags, ...usedTags]));
  }

  async getAllergensLookup() {
    const defaultAllergens = ['Глютен', 'Лактоза', 'Горіхи', 'Морепродукти', 'Арахіс', 'Яйця'];
    const dishes = await this.prismaService.dish.findMany({ select: { allergens: true } });
    const usedAllergens = Array.from(new Set(dishes.flatMap(d => d.allergens)));
    return Array.from(new Set([...defaultAllergens, ...usedAllergens]));
  }

  async createDish(categoryId: string, createDishDto: CreateDishDto, userId: number) {
    const category = await this.prismaService.category.findFirst({
      where: {
        id: categoryId,
        restaurant: { ownerId: userId },
      },
      select: { id: true },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const { ingredients, variants, modifierIds, upsellDishIds, ...dishData } = createDishDto;

    const dish = await this.prismaService.dish.create({
      data: {
        categoryId,
        name: dishData.name,
        description: dishData.description || '',
        price: dishData.price,
        weight: dishData.weight || '',
        cookingTime: dishData.cookingTime || '',
        calories: dishData.calories || '',
        badge: (dishData.badge as BadgeType) || BadgeType.NONE,
        taxRate: dishData.taxRate ?? 0,
        isAvailable: dishData.isAvailable ?? true,
        allergens: dishData.allergens ?? [],
        tags: dishData.tags ?? [],
        ingredients: {
          create: ingredients ?? [],
        },
        variants: {
          create: variants ?? [],
        },
      },
      include: {
        ingredients: true,
        variants: true,
      },
    });

    return {
      message: 'Dish created successfully',
      dish,
    };
  }

  async updateDish(dishId: string, updateDishDto: UpdateDishDto, userId: number) {
    const dish = await this.prismaService.dish.findFirst({
      where: {
        id: dishId,
        category: {
          restaurant: { ownerId: userId },
        },
      },
      select: { id: true },
    });

    if (!dish) {
      throw new NotFoundException('Dish not found');
    }

    const { ingredients, variants, modifierIds, upsellDishIds, categoryId, sortOrder, ...dishData } = updateDishDto;

    const updatedDish = await this.prismaService.$transaction(async (tx) => {
      if (ingredients) {
        await tx.dishIngredient.deleteMany({ where: { dishId } });
      }
      if (variants) {
        await tx.dishVariant.deleteMany({ where: { dishId } });
      }

      return tx.dish.update({
        where: { id: dishId },
        data: {
          name: dishData.name,
          description: dishData.description,
          price: dishData.price,
          weight: dishData.weight,
          cookingTime: dishData.cookingTime,
          calories: dishData.calories,
          badge: dishData.badge ? (dishData.badge as BadgeType) : undefined,
          taxRate: dishData.taxRate,
          isAvailable: dishData.isAvailable,
          allergens: dishData.allergens,
          tags: dishData.tags,
          ...(categoryId && { categoryId }),
          ...(sortOrder !== undefined && { sortOrder }),
          ...(ingredients && {
            ingredients: {
              create: ingredients,
            },
          }),
          ...(variants && {
            variants: {
              create: variants,
                },
              }),
            },
            include: {
              ingredients: true,
              variants: true,
            },
          });
        });

    return {
      message: 'Dish updated successfully',
      dish: updatedDish,
    };
  }

  async reorderDishes(reorderDishesDto: ReorderDishesDto, userId: number) {
    const dishIds = reorderDishesDto.items.map((i) => i.id);

    const dishes = await this.prismaService.dish.findMany({
      where: {
        id: { in: dishIds },
        category: {
          restaurant: { ownerId: userId },
        },
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

    return {
      message: 'Dishes reordered successfully',
    };
  }

  async deleteDish(dishId: string, userId: number) {
    const dish = await this.prismaService.dish.findFirst({
      where: {
        id: dishId,
        category: {
          restaurant: { ownerId: userId },
        },
      },
      select: { id: true },
    });

    if (!dish) {
      throw new NotFoundException('Dish not found');
    }

    await this.prismaService.dish.delete({
      where: { id: dishId },
    });

    return {
      message: 'Dish deleted successfully',
    };
  }
}