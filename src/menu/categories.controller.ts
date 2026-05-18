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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('Categories')
@Controller('menu/owner/categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @ApiOperation({ summary: 'Create category for owner' })
  @ApiCookieAuth('gustio_session')
  @ApiBody({
    type: CreateCategoryDto,
    schema: {
      example: {
        restaurantId: 1,
        name: 'Desserts',
        sortOrder: 2,
        dishes: [
          {
            name: 'Tiramisu',
            description: 'Classic Italian dessert',
            price: 6.5,
            isAvailable: true,
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Category created successfully',
    schema: {
      example: {
        message: 'Category created successfully',
        category: {
          id: 'cat_2',
          restaurantId: 1,
          name: 'Desserts',
          sortOrder: 2,
          dishes: [
            {
              id: 'dish_3',
              categoryId: 'cat_2',
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
              allergens: [],
              isAvailable: true,
            },
          ],
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Session token is required' })
  @ApiResponse({ status: 401, description: 'Invalid or expired session token' })
  @ApiResponse({ status: 404, description: 'Restaurant not found' })
  @Post()
  createCategory(
    @Body() createCategoryDto: CreateCategoryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.categoriesService.createCategory(
      createCategoryDto,
      request.user.id,
    );
  }

  @ApiOperation({ summary: 'Update category for owner' })
  @ApiCookieAuth('gustio_session')
  @ApiParam({ name: 'categoryId', type: String, example: 'cat_1' })
  @ApiBody({
    type: UpdateCategoryDto,
    schema: {
      example: {
        name: 'Updated desserts',
        sortOrder: 3,
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Category updated successfully',
    schema: {
      example: {
        message: 'Category updated successfully',
        category: {
          id: 'cat_1',
          restaurantId: 1,
          name: 'Updated desserts',
          sortOrder: 3,
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Session token is required' })
  @ApiResponse({ status: 401, description: 'Invalid or expired session token' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @Patch(':categoryId')
  updateCategory(
    @Param('categoryId') categoryId: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.categoriesService.updateCategory(
      categoryId,
      updateCategoryDto,
      request.user.id,
    );
  }

  @ApiOperation({ summary: 'Delete category for owner' })
  @ApiCookieAuth('gustio_session')
  @ApiParam({ name: 'categoryId', type: String, example: 'cat_1' })
  @ApiResponse({
    status: 200,
    description: 'Category deleted successfully',
    schema: {
      example: {
        message: 'Category deleted successfully',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Session token is required' })
  @ApiResponse({ status: 401, description: 'Invalid or expired session token' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @Delete(':categoryId')
  deleteCategory(
    @Param('categoryId') categoryId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.categoriesService.deleteCategory(categoryId, request.user.id);
  }
}
