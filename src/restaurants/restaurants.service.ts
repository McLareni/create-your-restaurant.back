import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';

type RestaurantCreateFn = (args: {
  data: CreateRestaurantDto & { ownerId: number };
}) => Promise<unknown>;

type RestaurantFindUniqueBySlugFn = (args: {
  where: {
    slug: string;
  };
}) => Promise<unknown>;

@Injectable()
export class RestaurantsService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createRestaurantDto: CreateRestaurantDto, userId: number) {
    const createRestaurant = (
      this.prismaService as unknown as {
        restaurant: { create: RestaurantCreateFn };
      }
    ).restaurant.create;

    const restaurant = await createRestaurant({
      data: {
        ...createRestaurantDto,
        ownerId: userId,
      },
    });

    return {
      message: 'Restaurant created successfully',
      restaurant: restaurant,
    };
  }

  async checkSlug(slug: string) {
    const findRestaurantBySlug = (
      this.prismaService as unknown as {
        restaurant: { findUnique: RestaurantFindUniqueBySlugFn };
      }
    ).restaurant.findUnique;

    const existingRestaurant = await findRestaurantBySlug({
      where: { slug },
    });
    return { isAvailable: !existingRestaurant };
  }
}
