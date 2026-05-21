import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDishDto } from './dto/create-dish.dto';
import { UpdateDishDto } from './dto/update-dish.dto';
import { ReorderDishesDto } from './dto/reorder-dishes.dto';
import { DishBadge } from '@prisma/client';

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

  async deleteTagLookup(tagName: string, userId: number) {
    await this.prismaService.$executeRaw`
      UPDATE "Dish" 
      SET tags = array_remove(tags, ${tagName})
      WHERE "categoryId" IN (
        SELECT c.id FROM "Category" c
        JOIN "Restaurant" r ON c."restaurantId" = r.id
        WHERE r."ownerId" = ${userId}
      )
    `;
    return { message: 'Tag removed from all dishes successfully' };
  }

  async deleteAllergenLookup(allergenName: string, userId: number) {
    await this.prismaService.$executeRaw`
      UPDATE "Dish" 
      SET allergens = array_remove(allergens, ${allergenName})
      WHERE "categoryId" IN (
        SELECT c.id FROM "Category" c
        JOIN "Restaurant" r ON c."restaurantId" = r.id
        WHERE r."ownerId" = ${userId}
      )
    `;
    return { message: 'Allergen removed from all dishes successfully' };
  }

  async createDish(categoryId: string, createDishDto: CreateDishDto, userId: number) {
    const category = await this.prismaService.category.findFirst({
      where: { id: categoryId, restaurant: { ownerId: userId } },
      select: { id: true },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const { ingredients, variants, modifierIds, ...dishData } = createDishDto;

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
          badge: (dishData.badge as DishBadge) || DishBadge.NONE,
          taxRate: dishData.taxRate ?? 20,
          isAvailable: dishData.isAvailable ?? true,
          allergens: dishData.allergens ?? [],
          tags: dishData.tags ?? [],
        },
      });

      if (variants && variants.length > 0) {
        await tx.dishVariant.createMany({
          data: variants.map((v) => ({
            dishId: dish.id,
            name: v.name,
            price: v.price,
            sku: v.sku || null,
          })),
        });
      }

      if (ingredients && ingredients.length > 0) {
        await tx.ingredientItem.createMany({
          data: ingredients.map((i) => ({
            dishId: dish.id,
            name: i.name,
            quantity: i.quantity,
            unit: i.unit,
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

      return tx.dish.findUnique({
        where: { id: dish.id },
        include: { variants: true, ingredients: true },
      });
    });
  }

  async updateDish(dishId: string, updateDishDto: UpdateDishDto, userId: number) {
    const dish = await this.prismaService.dish.findFirst({
      where: { id: dishId, category: { restaurant: { ownerId: userId } } },
      select: { id: true },
    });

    if (!dish) {
      throw new NotFoundException('Dish not found');
    }

    const { ingredients, variants, modifierIds, categoryId, sortOrder, ...dishData } = updateDishDto;

    return this.prismaService.$transaction(async (tx) => {
      if (ingredients) await tx.ingredientItem.deleteMany({ where: { dishId } });
      if (variants) await tx.dishVariant.deleteMany({ where: { dishId } });
      await tx.dishModifier.deleteMany({ where: { dishId } });

      const updatedDish = await tx.dish.update({
        where: { id: dishId },
        data: {
          name: dishData.name,
          description: dishData.description,
          price: dishData.price,
          weight: dishData.weight ?? null,
          cookingTime: dishData.cookingTime ?? null,
          calories: dishData.calories ?? null,
          isVegan: dishData.isVegan,
          isSpicy: dishData.isSpicy,
          isLactoseFree: dishData.isLactoseFree,
          badge: dishData.badge ? (dishData.badge as DishBadge) : undefined,
          taxRate: dishData.taxRate,
          isAvailable: dishData.isAvailable,
          allergens: dishData.allergens,
          tags: dishData.tags,
          ...(categoryId && { categoryId }),
        },
        include: { ingredients: true, variants: true },
      });

      if (variants && variants.length > 0) {
        await tx.dishVariant.createMany({
          data: variants.map((v) => ({
            dishId,
            name: v.name,
            price: v.price,
            sku: v.sku || null,
          })),
        });
      }

      if (ingredients && ingredients.length > 0) {
        await tx.ingredientItem.createMany({
          data: ingredients.map((i) => ({
            dishId,
            name: i.name,
            quantity: i.quantity,
            unit: i.unit,
          })),
        });
      }

      if (modifierIds && modifierIds.length > 0) {
        await tx.dishModifier.createMany({
          data: modifierIds.map((modId) => ({
            dishId,
            modifierGroupId: modId,
          })),
        });
      }

      return updatedDish;
    });
  }

  async reorderDishes(reorderDishesDto: ReorderDishesDto, userId: number) {
    return { message: 'Reordering is managed via categories order' };
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