import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CloudinaryCleanupService } from 'src/cloudinary/cloudinary-cleanup.service';
import { BadgeType } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import type { CreateDishDto } from 'src/menu/dto/create-dish.dto';
import type { UpdateDishDto } from 'src/menu/dto/update-dish.dto';
import type { ReorderDishesDto } from 'src/menu/dto/reorder-dishes.dto';

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
    private readonly cloudinaryCleanupService: CloudinaryCleanupService,
  ) {}

  async createDish(
    restaurantId: number,
    categoryId: string,
    createDishDto: CreateDishDto,
  ) {
    const category = await this.prismaService.category.findFirst({
      where: { id: categoryId, restaurantId },
    });

    if (!category) throw new NotFoundException('errors.category_not_found');

    const { ingredients, modifierIds, ...dishData } = createDishDto;
    const dishCount = await this.prismaService.dish.count({
      where: { categoryId },
    });

    const result = await this.prismaService.$transaction(async (tx) => {
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
                  where: { restaurantId_name: { restaurantId, name } },
                  create: { restaurantId, name },
                })),
              }
            : undefined,
          tags: dishData.tags?.length
            ? {
                connectOrCreate: dishData.tags.map((name) => ({
                  where: { restaurantId_name: { restaurantId, name } },
                  create: { restaurantId, name },
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
            inventoryItemId: i.inventoryItemId || null,
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
        include: {
          ingredients: true,
          allergens: true,
          tags: true,
          images: { include: { image: true } },
        },
      });
    });

    return result;
  }

  async updateDish(
    restaurantId: number,
    dishId: string,
    updateDishDto: UpdateDishDto,
  ) {
    const dish = await this.prismaService.dish.findFirst({
      where: { id: dishId, category: { restaurantId } },
    });

    if (!dish) throw new NotFoundException('errors.dish_not_found');

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
    };

    const result = await this.prismaService.$transaction(async (tx) => {
      if (ingredients) {
        await tx.dishIngredient.deleteMany({ where: { dishId } });
        if (ingredients.length > 0) {
          await tx.dishIngredient.createMany({
            data: ingredients.map((i) => ({
              dishId,
              name: i.name,
              quantity: i.quantity,
              unit: i.unit,
              inventoryItemId: i.inventoryItemId || null,
            })),
          });
        }
      }

      if (modifierIds !== undefined) {
        await tx.dishModifier.deleteMany({ where: { dishId } });
        if (modifierIds.length > 0) {
          await tx.dishModifier.createMany({
            data: modifierIds.map((modId) => ({
              dishId,
              modifierGroupId: modId,
            })),
          });
        }
      }

      if (dishData.allergens !== undefined) {
        dishUpdateData.allergens = {
          set: [],
          connectOrCreate: dishData.allergens.map((name) => ({
            where: { restaurantId_name: { restaurantId, name } },
            create: { restaurantId, name },
          })),
        };
      }

      if (dishData.tags !== undefined) {
        dishUpdateData.tags = {
          set: [],
          connectOrCreate: dishData.tags.map((name) => ({
            where: { restaurantId_name: { restaurantId, name } },
            create: { restaurantId, name },
          })),
        };
      }

      return await tx.dish.update({
        where: { id: dishId },
        data: dishUpdateData,
        include: { ingredients: true, allergens: true, tags: true },
      });
    });

    return result;
  }

  async updateDishPhotos(
    restaurantId: number,
    dishId: string,
    layout: { type: string; url?: string }[],
    files?: UploadedDishImage[],
  ) {
    const dish = await this.prismaService.dish.findFirst({
      where: { id: dishId, category: { restaurantId } },
    });
    if (!dish) throw new NotFoundException('errors.dish_not_found');

    const uploadedImages: { url: string; publicId: string }[] = [];
    if (files && files.length > 0) {
      for (const file of files) {
        const uploaded = await this.cloudinaryService.uploadImage(
          file.buffer,
          'dishes',
        );
        this.cloudinaryCleanupService.scheduleDeletion(uploaded.public_id);
        uploadedImages.push({
          url: uploaded.secure_url,
          publicId: uploaded.public_id,
        });
      }
    }

    const finalUrls: string[] = [];
    let newFileIndex = 0;
    for (const item of layout) {
      if (item.type === 'existing' && item.url) {
        finalUrls.push(item.url);
      } else if (item.type === 'new' && newFileIndex < uploadedImages.length) {
        finalUrls.push(uploadedImages[newFileIndex++].url);
      }
    }

    await this.prismaService.$transaction(async (tx) => {
      const oldImageDishes = await tx.imageDish.findMany({
        where: { dishId },
        include: { image: true },
      });

      const urlsToKeep = new Set(finalUrls);
      const imagesToDelete = oldImageDishes.filter(
        (oid) => !urlsToKeep.has(oid.image.url),
      );

      await tx.imageDish.deleteMany({ where: { dishId } });

      if (imagesToDelete.length > 0) {
        await tx.image.deleteMany({
          where: { id: { in: imagesToDelete.map((i) => i.imageId) } },
        });
      }

      for (const url of finalUrls) {
        let image = await tx.image.findFirst({ where: { url } });
        if (!image) {
          image = await tx.image.create({ data: { url } });
        }
        await tx.imageDish.create({
          data: { dishId, imageId: image.id },
        });
      }
    });

    uploadedImages.forEach((img) => {
      this.cloudinaryCleanupService.cancelDeletion(img.publicId);
    });

    return { message: 'success.photos_updated' };
  }

  async reorderDishes(
    restaurantId: number,
    reorderDishesDto: ReorderDishesDto,
  ) {
    const dishIds = reorderDishesDto.items.map((i) => i.id);

    const validCount = await this.prismaService.dish.count({
      where: { id: { in: dishIds }, category: { restaurantId } },
    });

    if (validCount !== dishIds.length) {
      throw new BadRequestException('errors.invalid_dishes_payload');
    }

    await this.prismaService.$transaction(
      reorderDishesDto.items.map((item) =>
        this.prismaService.dish.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );

    return { message: 'success.dishes_reordered' };
  }

  async deleteDish(restaurantId: number, dishId: string) {
    const dish = await this.prismaService.dish.findFirst({
      where: { id: dishId, category: { restaurantId } },
    });

    if (!dish) throw new NotFoundException('errors.dish_not_found');

    await this.prismaService.dish.delete({ where: { id: dishId } });

    return { message: 'success.dish_deleted' };
  }
}
