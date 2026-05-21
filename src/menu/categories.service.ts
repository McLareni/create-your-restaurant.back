import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ReorderCategoriesDto } from './dto/reorder-categories.dto';
import { BadgeType } from '@prisma/client';

@Injectable()
export class CategoriesService {
  constructor(private readonly prismaService: PrismaService) {}

  async createCategory(createCategoryDto: CreateCategoryDto, userId: number) {
    const restaurant = await this.prismaService.restaurant.findFirst({
      where: { id: createCategoryDto.restaurantId, ownerId: userId },
      select: { id: true },
    });

    if (!restaurant) throw new NotFoundException('Restaurant not found');

    const category = await this.prismaService.category.create({
      data: {
        restaurantId: createCategoryDto.restaurantId,
        name: createCategoryDto.name,
        sortOrder: createCategoryDto.sortOrder ?? 0,
        dishes: {
          create: (createCategoryDto.dishes ?? []).map((dish) => {
            const { ingredients, variants, modifierIds, upsellDishIds, ...dishData } = dish;
            return {
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
              allergens: dishData.allergens ?? [],
              tags: dishData.tags ?? [],
              ingredients: { create: ingredients ?? [] },
              variants: { create: variants ?? [] },
            };
          }),
        },
      },
      include: {
        dishes: { include: { ingredients: true, variants: true } },
      },
    });

    return { message: 'Category created successfully', category };
  }

  async reorderCategories(reorderCategoriesDto: ReorderCategoriesDto, userId: number) {
    const categoryIds = reorderCategoriesDto.items.map((i) => i.id);

    const categories = await this.prismaService.category.findMany({
      where: {
        id: { in: categoryIds },
        restaurant: { ownerId: userId },
      },
      select: { id: true },
    });

    if (categories.length !== categoryIds.length) {
      throw new NotFoundException('Some categories not found or access denied');
    }

    await this.prismaService.$transaction(
      reorderCategoriesDto.items.map((item) =>
        this.prismaService.category.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );

    return { message: 'Categories reordered successfully' };
  }

  async updateCategory(categoryId: string, updateCategoryDto: UpdateCategoryDto, userId: number) {
    const category = await this.prismaService.category.findFirst({
      where: { id: categoryId, restaurant: { ownerId: userId } },
      select: { id: true },
    });

    if (!category) throw new NotFoundException('Category not found');

    const updatedCategory = await this.prismaService.category.update({
      where: { id: categoryId },
      data: updateCategoryDto,
    });

    return { message: 'Category updated successfully', category: updatedCategory };
  }

  async deleteCategory(categoryId: string, userId: number) {
    const category = await this.prismaService.category.findFirst({
      where: { id: categoryId, restaurant: { ownerId: userId } },
      select: { id: true },
    });

    if (!category) throw new NotFoundException('Category not found');

    await this.prismaService.category.delete({ where: { id: categoryId } });

    return { message: 'Category deleted successfully' };
  }
}