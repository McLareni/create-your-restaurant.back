import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prismaService: PrismaService) {}

  async createCategory(createCategoryDto: CreateCategoryDto, userId: number) {
    const restaurant = await this.prismaService.restaurant.findFirst({
      where: {
        id: createCategoryDto.restaurantId,
        ownerId: userId,
      },
      select: { id: true },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const category = await this.prismaService.category.create({
      data: {
        restaurantId: createCategoryDto.restaurantId,
        name: createCategoryDto.name,
        sortOrder: createCategoryDto.sortOrder,
        dishes: {
          create: (createCategoryDto.dishes ?? []).map((dish) => {
            const { ingredients, ...dishData } = dish;
            return {
              name: dishData.name,
              description: dishData.description,
              price: dishData.price,
              weight: dishData.weight,
              cookingTime: dishData.cookingTime,
              calories: dishData.calories,
              badge: dishData.badge,
              taxRate: dishData.taxRate ?? 0,
              isAvailable: dishData.isAvailable ?? true,
              allergens: dishData.allergens ?? [],
              tags: dishData.tags ?? [],
              upsellDishIds: dishData.upsellDishIds ?? [],
              ingredients: {
                create: ingredients ?? [],
              },
            };
          }),
        },
      },
      include: {
        dishes: {
          include: {
            ingredients: true,
          },
        },
      },
    });

    return {
      message: 'Category created successfully',
      category,
    };
  }

  async updateCategory(
    categoryId: string,
    updateCategoryDto: UpdateCategoryDto,
    userId: number,
  ) {
    const category = await this.prismaService.category.findFirst({
      where: {
        id: categoryId,
        restaurant: {
          ownerId: userId,
        },
      },
      select: { id: true },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const updatedCategory = await this.prismaService.category.update({
      where: { id: categoryId },
      data: updateCategoryDto,
    });

    return {
      message: 'Category updated successfully',
      category: updatedCategory,
    };
  }

  async deleteCategory(categoryId: string, userId: number) {
    const category = await this.prismaService.category.findFirst({
      where: {
        id: categoryId,
        restaurant: {
          ownerId: userId,
        },
      },
      select: { id: true },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    await this.prismaService.category.delete({
      where: { id: categoryId },
    });

    return {
      message: 'Category deleted successfully',
    };
  }
}