import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../restaurants/middleware/session-auth.middleware';
import { CreateDishDto } from './dto/create-dish.dto';
import { UpdateDishDto } from './dto/update-dish.dto';
import { DishesService } from './dishes.service';

@ApiTags('Dishes')
@Controller('menu/owner')
export class DishesController {
  constructor(private readonly dishesService: DishesService) {}

  @ApiOperation({ summary: 'Create dish for owner' })
  @ApiCookieAuth('gustio_session')
  @ApiParam({ name: 'categoryId', type: String, example: 'cat_1' })
  @ApiBody({
    type: CreateDishDto,
    schema: {
      example: {
        name: 'Tiramisu',
        description: 'Classic Italian dessert',
        price: 6.5,
        isAvailable: true,
        allergens: ['lactose'],
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Dish created successfully',
    schema: {
      example: {
        message: 'Dish created successfully',
        dish: {
          id: 'dish_3',
          categoryId: 'cat_1',
          name: 'Tiramisu',
          description: 'Classic Italian dessert',
          price: 6.5,
          weight: null,
          cookingTime: null,
          calories: null,
          isVegan: false,
          isSpicy: false,
          isLactoseFree: false,
          badge: 'NONE',
          allergens: ['lactose'],
          isAvailable: true,
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Session token is required' })
  @ApiResponse({ status: 401, description: 'Invalid or expired session token' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @Post('categories/:categoryId/dishes')
  createDish(
    @Param('categoryId') categoryId: string,
    @Body() createDishDto: CreateDishDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.dishesService.createDish(
      categoryId,
      createDishDto,
      request.user.id,
    );
  }

  @ApiOperation({ summary: 'Update dish for owner' })
  @ApiCookieAuth('gustio_session')
  @ApiParam({ name: 'dishId', type: String, example: 'dish_1' })
  @ApiBody({
    type: UpdateDishDto,
    schema: {
      example: {
        isAvailable: false,
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Dish updated successfully',
    schema: {
      example: {
        message: 'Dish updated successfully',
        dish: {
          id: 'dish_1',
          categoryId: 'cat_1',
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
          isAvailable: false,
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Session token is required' })
  @ApiResponse({ status: 401, description: 'Invalid or expired session token' })
  @ApiResponse({ status: 404, description: 'Dish not found' })
  @Patch('dishes/:dishId')
  updateDish(
    @Param('dishId') dishId: string,
    @Body() updateDishDto: UpdateDishDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.dishesService.updateDish(
      dishId,
      updateDishDto,
      request.user.id,
    );
  }

  @ApiOperation({ summary: 'Delete dish for owner' })
  @ApiCookieAuth('gustio_session')
  @ApiParam({ name: 'dishId', type: String, example: 'dish_1' })
  @ApiResponse({
    status: 200,
    description: 'Dish deleted successfully',
    schema: {
      example: {
        message: 'Dish deleted successfully',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Session token is required' })
  @ApiResponse({ status: 401, description: 'Invalid or expired session token' })
  @ApiResponse({ status: 404, description: 'Dish not found' })
  @Delete('dishes/:dishId')
  deleteDish(
    @Param('dishId') dishId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.dishesService.deleteDish(dishId, request.user.id);
  }
}
