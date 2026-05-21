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
import { BadgeType } from '@prisma/client';

type UploadedDishImage = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

const dishWithImagesSelect = {
  id: true,
  categoryId: true,
  name: true,
  description: true,
  price: true,
  weight: true,
  cookingTime: true,
  calories: true,
  isVegan: true,
  isSpicy: true,
  isLactoseFree: true,
  badge: true,
  allergens: true,
  isAvailable: true,
  images: {
    select: {
      image: {
        select: {
          id: true,
          url: true,
        },
      },
    },
  },
} as const;

@Injectable()
export class DishesService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

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

    const { ingredients, variants, modifierIds, upsellDishIds, ...dishData } = createDishDto;
    const dishCount = await this.prismaService.dish.count({ where: { categoryId } });

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
          taxRate: dishData.taxRate ?? 0,
          isAvailable: dishData.isAvailable ?? true,
          sortOrder: dishCount,
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
        await tx.dishIngredient.createMany({
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

      if (upsellDishIds && upsellDishIds.length > 0) {
        await tx.dishUpsell.createMany({
          data: upsellDishIds.map((targetId) => ({
            mainDishId: dish.id,
            upsellDishId: targetId,
          })),
        });
      }

      return tx.dish.findUnique({
        where: { id: dish.id },
        include: { variants: true, ingredients: true },
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

    const { ingredients, variants, modifierIds, upsellDishIds, categoryId, sortOrder, ...dishData } = updateDishDto;

    return this.prismaService.$transaction(async (tx) => {
      if (ingredients) await tx.dishIngredient.deleteMany({ where: { dishId } });
      if (variants) await tx.dishVariant.deleteMany({ where: { dishId } });
      
      await tx.dishModifier.deleteMany({ where: { dishId } });
      await tx.dishUpsell.deleteMany({ where: { mainDishId: dishId } });

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
          badge: dishData.badge ? (dishData.badge as BadgeType) : undefined,
          taxRate: dishData.taxRate,
          isAvailable: dishData.isAvailable,
          allergens: dishData.allergens,
          tags: dishData.tags,
          ...(categoryId && { categoryId }),
          ...(sortOrder !== undefined && { sortOrder }),
          ...(ingredients && { ingredients: { create: ingredients } }),
          ...(variants && { variants: { create: variants } }),
        },
        include: { ingredients: true, variants: true },
      });

      if (modifierIds && modifierIds.length > 0) {
        await tx.dishModifier.createMany({
          data: modifierIds.map((modId) => ({
            dishId,
            modifierGroupId: modId,
          })),
        });
      }

      if (upsellDishIds && upsellDishIds.length > 0) {
        await tx.dishUpsell.createMany({
          data: upsellDishIds.map((targetId) => ({
            mainDishId: dishId,
            upsellDishId: targetId,
          })),
        });
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
