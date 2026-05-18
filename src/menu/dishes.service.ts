import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDishDto } from './dto/create-dish.dto';
import { UpdateDishDto } from './dto/update-dish.dto';

@Injectable()
export class DishesService {
  constructor(private readonly prismaService: PrismaService) {}

  async createDish(categoryId: string, createDishDto: CreateDishDto, userId: number) {
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

    const dish = await this.prismaService.dish.create({
      data: {
        categoryId,
        ...createDishDto,
        allergens: createDishDto.allergens ?? [],
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
          restaurant: {
            ownerId: userId,
          },
        },
      },
      select: { id: true },
    });

    if (!dish) {
      throw new NotFoundException('Dish not found');
    }

    const updatedDish = await this.prismaService.dish.update({
      where: { id: dishId },
      data: {
        ...updateDishDto,
        allergens: updateDishDto.allergens,
      },
    });

    return {
      message: 'Dish updated successfully',
      dish: updatedDish,
    };
  }

  async deleteDish(dishId: string, userId: number) {
    const dish = await this.prismaService.dish.findFirst({
      where: {
        id: dishId,
        category: {
          restaurant: {
            ownerId: userId,
          },
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
