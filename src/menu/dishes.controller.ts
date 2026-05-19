import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
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

type UploadedDishImage = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

@ApiTags('Dishes')
@Controller('menu/owner')
export class DishesController {
  constructor(private readonly dishesService: DishesService) {}

  @ApiOperation({ summary: 'Create dish for owner' })
  @ApiCookieAuth('gustio_session')
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'categoryId', type: String, example: 'cat_1' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'price'],
      properties: {
        name: { type: 'string', example: 'Tiramisu' },
        description: {
          type: 'string',
          example: 'Classic Italian dessert',
        },
        price: { type: 'number', example: 6.5 },
        weight: { type: 'number', example: 320 },
        cookingTime: { type: 'integer', example: 15 },
        calories: { type: 'integer', example: 780 },
        isVegan: { type: 'boolean', example: false },
        isSpicy: { type: 'boolean', example: false },
        isLactoseFree: { type: 'boolean', example: false },
        badge: { type: 'string', example: 'NONE' },
        allergens: {
          oneOf: [
            { type: 'array', items: { type: 'string' } },
            { type: 'string', example: 'lactose,gluten' },
          ],
        },
        isAvailable: { type: 'boolean', example: true },
        photo: { type: 'string', format: 'binary' },
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
          images: [
            {
              id: 'img_1',
              url: 'https://res.cloudinary.com/demo/image/upload/v1/dishes/example.png',
            },
          ],
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Session token is required' })
  @ApiResponse({ status: 401, description: 'Invalid or expired session token' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @Post('categories/:categoryId/dishes')
  @UseInterceptors(
    FileInterceptor('photo', {
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  createDish(
    @Param('categoryId') categoryId: string,
    @Body() createDishDto: CreateDishDto,
    @Req() request: AuthenticatedRequest,
    @UploadedFile() file?: UploadedDishImage,
  ) {
    return this.dishesService.createDish(
      categoryId,
      createDishDto,
      request.user.id,
      file,
    );
  }

  @ApiOperation({ summary: 'Update dish for owner' })
  @ApiCookieAuth('gustio_session')
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'dishId', type: String, example: 'dish_1' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Updated Tiramisu' },
        description: { type: 'string', example: 'Seasonal dessert' },
        price: { type: 'number', example: 7.2 },
        weight: { type: 'number', example: 340 },
        cookingTime: { type: 'integer', example: 18 },
        calories: { type: 'integer', example: 800 },
        isVegan: { type: 'boolean', example: false },
        isSpicy: { type: 'boolean', example: false },
        isLactoseFree: { type: 'boolean', example: false },
        badge: { type: 'string', example: 'NEW' },
        allergens: {
          oneOf: [
            { type: 'array', items: { type: 'string' } },
            { type: 'string', example: 'lactose,gluten' },
          ],
        },
        isAvailable: { type: 'boolean', example: false },
        photo: { type: 'string', format: 'binary' },
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
          images: [
            {
              id: 'img_2',
              url: 'https://res.cloudinary.com/demo/image/upload/v1/dishes/updated-example.png',
            },
          ],
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Session token is required' })
  @ApiResponse({ status: 401, description: 'Invalid or expired session token' })
  @ApiResponse({ status: 404, description: 'Dish not found' })
  @Patch('dishes/:dishId')
  @UseInterceptors(
    FileInterceptor('photo', {
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  updateDish(
    @Param('dishId') dishId: string,
    @Body() updateDishDto: UpdateDishDto,
    @Req() request: AuthenticatedRequest,
    @UploadedFile() file?: UploadedDishImage,
  ) {
    return this.dishesService.updateDish(
      dishId,
      updateDishDto,
      request.user.id,
      file,
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
