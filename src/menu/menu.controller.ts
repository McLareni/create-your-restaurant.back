import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiParam,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../restaurants/middleware/session-auth.middleware';
import { CreateMenuDto } from './dto/create-menu.dto';
import { MenuService } from './menu.service';

@ApiTags('Menu')
@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @ApiOperation({ summary: 'Get full restaurant menu for owner' })
  @ApiCookieAuth('gustio_session')
  @ApiParam({ name: 'restaurantId', type: Number, example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Full menu fetched successfully',
    schema: {
      example: {
        restaurantId: 1,
        categories: [
          {
            id: 'cat_1',
            name: 'Pizzas',
            sortOrder: 1,
            dishes: [
              {
                id: 'dish_1',
                name: 'Margherita',
                description: 'Tomato sauce, mozzarella, basil',
                price: 12.5,
                weight: 320,
                cookingTime: 15,
                calories: 780,
                isVegan: false,
                isSpicy: false,
                isLactoseFree: false,
                badge: 'NONE',
                allergens: ['gluten', 'lactose'],
                isAvailable: true,
                images: [
                  {
                    id: 'img_1',
                    url: 'https://res.cloudinary.com/demo/image/upload/v1/dishes/margherita.png',
                  },
                ],
              },
              {
                id: 'dish_2',
                name: 'Seasonal Pizza',
                description: null,
                price: 10,
                weight: null,
                cookingTime: null,
                calories: null,
                isVegan: false,
                isSpicy: false,
                isLactoseFree: false,
                badge: 'NONE',
                allergens: [],
                isAvailable: false,
                images: [],
              },
            ],
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Session token is required' })
  @ApiResponse({ status: 401, description: 'Invalid or expired session token' })
  @ApiResponse({ status: 404, description: 'Restaurant not found' })
  @Get('owner/:restaurantId')
  getMenuForOwner(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.menuService.getMenuForOwner(restaurantId, request.user.id);
  }

  @ApiOperation({ summary: 'Get restaurant menu' })
  @ApiParam({ name: 'restaurantId', type: Number, example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Menu fetched successfully',
    schema: {
      example: {
        restaurantId: 1,
        categories: [
          {
            id: 'cat_1',
            name: 'Pizzas',
            sortOrder: 1,
            dishes: [
              {
                id: 'dish_1',
                name: 'Margherita',
                description: 'Tomato sauce, mozzarella, basil',
                price: 12.5,
                weight: 320,
                cookingTime: 15,
                calories: 780,
                isVegan: false,
                isSpicy: false,
                isLactoseFree: false,
                badge: 'NONE',
                allergens: ['gluten', 'lactose'],
                isAvailable: true,
                images: [
                  {
                    id: 'img_1',
                    url: 'https://res.cloudinary.com/demo/image/upload/v1/dishes/margherita.png',
                  },
                ],
              },
            ],
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Restaurant not found' })
  @Get(':restaurantId')
  getMenu(@Param('restaurantId', ParseIntPipe) restaurantId: number) {
    return this.menuService.getMenu(restaurantId);
  }

  @ApiOperation({ summary: 'Create menu with categories and dishes' })
  @ApiCookieAuth('gustio_session')
  @ApiBody({
    type: CreateMenuDto,
    schema: {
      example: {
        restaurantId: 1,
        categories: [
          {
            name: 'Pizzas',
            sortOrder: 1,
            dishes: [
              {
                name: 'Margherita',
                description: 'Tomato sauce, mozzarella, basil',
                price: 12.5,
                allergens: ['gluten', 'lactose'],
                isAvailable: true,
              },
            ],
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Menu created successfully',
    schema: {
      example: {
        message: 'Menu created successfully',
        restaurantId: 1,
        categoriesCreated: 2,
        dishesCreated: 6,
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Session token is required' })
  @ApiResponse({ status: 401, description: 'Invalid or expired session token' })
  @ApiResponse({ status: 404, description: 'Restaurant not found' })
  @Post()
  create(
    @Body() createMenuDto: CreateMenuDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.menuService.create(createMenuDto, request.user.id);
  }
}
