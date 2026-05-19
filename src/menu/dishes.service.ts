import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDishDto } from './dto/create-dish.dto';
import { UpdateDishDto } from './dto/update-dish.dto';

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

  async createDish(
    categoryId: string,
    createDishDto: CreateDishDto,
    userId: number,
    file?: UploadedDishImage,
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

    const dish = await this.prismaService.dish.create({
      data: {
        categoryId,
        ...createDishDto,
        allergens: createDishDto.allergens ?? [],
      },
      select: dishWithImagesSelect,
    });

    if (file) {
      await this.attachImageToDish(dish.id, file);
    }

    const createdDish = await this.prismaService.dish.findUniqueOrThrow({
      where: { id: dish.id },
      select: dishWithImagesSelect,
    });

    return {
      message: 'Dish created successfully',
      dish: this.mapDishImages(createdDish),
    };
  }

  async updateDish(
    dishId: string,
    updateDishDto: UpdateDishDto,
    userId: number,
    file?: UploadedDishImage,
  ) {
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
      select: dishWithImagesSelect,
    });

    if (file) {
      await this.attachImageToDish(dishId, file);
    }

    const refreshedDish = file
      ? await this.prismaService.dish.findUniqueOrThrow({
          where: { id: dishId },
          select: dishWithImagesSelect,
        })
      : updatedDish;

    return {
      message: 'Dish updated successfully',
      dish: this.mapDishImages(refreshedDish),
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

  private async attachImageToDish(dishId: string, file: UploadedDishImage) {
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed');
    }

    const uploadedImage = await this.cloudinaryService.uploadImage(
      file.buffer,
      'dishes',
    );

    await this.prismaService.image.create({
      data: {
        url: uploadedImage.secure_url,
        imageDishes: {
          create: {
            dishId,
          },
        },
      },
    });
  }

  private mapDishImages(
    dish: {
      images: Array<{
        image: {
          id: string;
          url: string;
        };
      }>;
    } & Record<string, unknown>,
  ) {
    return {
      ...dish,
      images: dish.images.map(({ image }) => image),
    };
  }
}
