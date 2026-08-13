import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import type { CreateCategoryDto } from 'src/menu/dto/create-category.dto';
import type { UpdateCategoryDto } from 'src/menu/dto/update-category.dto';
import type { ReorderCategoriesDto } from 'src/menu/dto/reorder-categories.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prismaService: PrismaService) {}

  async createCategory(
    restaurantId: number,
    createCategoryDto: CreateCategoryDto,
  ) {
    const name = createCategoryDto.name.trim();
    const existing = await this.prismaService.category.findFirst({
      where: {
        restaurantId,
        name: { equals: name, mode: 'insensitive' },
      },
    });

    if (existing) {
      throw new BadRequestException('errors.category_already_exists');
    }

    const category = await this.prismaService.category.create({
      data: {
        restaurantId,
        name,
        sortOrder: createCategoryDto.sortOrder ?? 0,
      },
    });
    return { message: 'success.category_created', category };
  }

  async reorderCategories(
    restaurantId: number,
    reorderCategoriesDto: ReorderCategoriesDto,
  ) {
    const categoryIds = reorderCategoriesDto.items.map((i) => i.id);
    const validCount = await this.prismaService.category.count({
      where: {
        id: { in: categoryIds },
        restaurantId,
      },
    });
    if (validCount !== categoryIds.length) {
      throw new BadRequestException('errors.invalid_categories_payload');
    }
    await this.prismaService.$transaction(
      reorderCategoriesDto.items.map((item) =>
        this.prismaService.category.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );
    return { message: 'success.categories_reordered' };
  }

  async updateCategory(
    restaurantId: number,
    categoryId: string,
    updateCategoryDto: UpdateCategoryDto,
  ) {
    const category = await this.prismaService.category.findFirst({
      where: { id: categoryId, restaurantId },
    });
    if (!category) {
      throw new NotFoundException('errors.category_not_found');
    }

    if (updateCategoryDto.name) {
      const name = updateCategoryDto.name.trim();
      const existing = await this.prismaService.category.findFirst({
        where: {
          restaurantId,
          name: { equals: name, mode: 'insensitive' },
          id: { not: categoryId },
        },
      });
      if (existing) {
        throw new BadRequestException('errors.category_already_exists');
      }
    }

    const updatedCategory = await this.prismaService.category.update({
      where: { id: categoryId },
      data: {
        name: updateCategoryDto.name
          ? updateCategoryDto.name.trim()
          : undefined,
        sortOrder: updateCategoryDto.sortOrder,
      },
    });
    return {
      message: 'success.category_updated',
      category: updatedCategory,
    };
  }

  async deleteCategory(restaurantId: number, categoryId: string) {
    const category = await this.prismaService.category.findFirst({
      where: { id: categoryId, restaurantId },
    });
    if (!category) {
      throw new NotFoundException('errors.category_not_found');
    }
    await this.prismaService.category.delete({
      where: { id: categoryId },
    });
    return { message: 'success.category_deleted' };
  }
}
