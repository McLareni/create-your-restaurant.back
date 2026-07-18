import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMenuDto } from './dto/create-menu.dto';

@Injectable()
export class MenuService {
  constructor(private readonly prismaService: PrismaService) {}

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

  async getMenuForOwner(restaurantId: number, userId: number) {
    const restaurant = await this.prismaService.restaurant.findFirst({
      where: {
        id: restaurantId,
        ownerId: userId,
      },
      include: {
        categories: {
          orderBy: { sortOrder: 'asc' },
          include: {
            dishes: {
              orderBy: { sortOrder: 'asc' },
              include: {
                images: {
                  include: {
                    image: {
                      select: {
                        id: true,
                        url: true,
                      },
                    },
                  },
                },
                ingredients: true,
                allergens: true,
                tags: true,
                modifiers: true,
              },
            },
          },
        },
      },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    return {
      restaurantId: restaurant.id,
      categories: restaurant.categories.map((category) => ({
        ...category,
        dishes: category.dishes.map((dish) => this.mapDishImages(dish)),
      })),
    };
  }

  async getMenu(restaurantId: number) {
    const restaurant = await this.prismaService.restaurant.findUnique({
      where: { id: restaurantId },
      include: {
        categories: {
          orderBy: { sortOrder: 'asc' },
          include: {
            dishes: {
              orderBy: { sortOrder: 'asc' },
              include: {
                images: {
                  include: {
                    image: {
                      select: {
                        id: true,
                        url: true,
                      },
                    },
                  },
                },
                ingredients: true,
                allergens: true,
                tags: true,
              },
            },
          },
        },
      },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    return this.mapPublicMenuResponse(restaurant);
  }

  async getMenuBySlug(slug: string) {
    const restaurant = await this.prismaService.restaurant.findUnique({
      where: { slug },
      include: {
        categories: {
          orderBy: { sortOrder: 'asc' },
          include: {
            dishes: {
              orderBy: { sortOrder: 'asc' },
              include: {
                images: {
                  include: {
                    image: {
                      select: {
                        id: true,
                        url: true,
                      },
                    },
                  },
                },
                ingredients: true,
                allergens: true,
                tags: true,
              },
            },
          },
        },
      },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    return this.mapPublicMenuResponse(restaurant);
  }

  private mapPublicMenuResponse(restaurant: {
    id: number;
    title: string;
    categories: Array<{
      id: string;
      restaurantId: number;
      name: string;
      sortOrder: number;
      dishes: Array<
        Record<string, unknown> & {
          allergens?: Array<{ name: string }>;
          tags?: Array<{ name: string }>;
          images: Array<{
            image: {
              id: string;
              url: string;
            };
          }>;
        }
      >;
    }>;
  }) {
    return {
      restaurantId: restaurant.id,
      restaurantName: restaurant.title,
      categories: restaurant.categories.map((category) => ({
        ...category,
        dishes: category.dishes.map((dish) => {
          const mapped = this.mapDishImages(dish);
          return {
            ...mapped,
            allergens: dish.allergens?.map((item) => item.name) ?? [],
            tags: dish.tags?.map((item) => item.name) ?? [],
          };
        }),
      })),
    };
  }

  async create(createMenuDto: CreateMenuDto, userId: number) {
    const restaurant = await this.prismaService.restaurant.findFirst({
      where: {
        id: createMenuDto.restaurantId,
        ownerId: userId,
      },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    let dishesCreated = 0;
    createMenuDto.categories.forEach((cat) => {
      dishesCreated += cat.dishes?.length || 0;
    });

    await this.prismaService.restaurant.update({
      where: { id: createMenuDto.restaurantId },
      data: {
        categories: {
          create: createMenuDto.categories.map((category) => ({
            name: category.name,
            sortOrder: category.sortOrder ?? 0,
            dishes: {
              create: (category.dishes || []).map((dish) => ({
                name: dish.name,
                description: dish.description ?? '',
                price: dish.price,
                weight: dish.weight ?? null,
                cookingTime: dish.cookingTime ?? null,
                calories: dish.calories ?? null,
                isVegan: dish.isVegan ?? false,
                isSpicy: dish.isSpicy ?? false,
                isLactoseFree: dish.isLactoseFree ?? false,
                badge: 'NONE',
                isAvailable: dish.isAvailable ?? true,
                allergens: dish.allergens?.length
                  ? {
                      connectOrCreate: dish.allergens.map((name) => ({
                        where: {
                          restaurantId_name: {
                            restaurantId: createMenuDto.restaurantId,
                            name,
                          },
                        },
                        create: {
                          restaurantId: createMenuDto.restaurantId,
                          name,
                        },
                      })),
                    }
                  : undefined,
              })),
            },
          })),
        },
      },
    });

    return {
      message: 'Menu created successfully',
      restaurantId: createMenuDto.restaurantId,
      categoriesCreated: createMenuDto.categories.length,
      dishesCreated,
    };
  }
}
