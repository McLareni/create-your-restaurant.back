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
import { ReorderCategoriesDto } from './dto/reorder-categories.dto';

@ApiTags('Categories')
@Controller('menu/owner/categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @ApiOperation({ summary: 'Create category for owner' })
  @ApiCookieAuth('gustio_session')
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

  @ApiOperation({ summary: 'Reorder categories for owner' })
  @ApiCookieAuth('gustio_session')
  @ApiBody({ type: ReorderCategoriesDto })
  @ApiResponse({
    status: 200,
    description: 'Categories reordered successfully',
  })
  @Patch('reorder')
  reorderCategories(
    @Body() reorderCategoriesDto: ReorderCategoriesDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.categoriesService.reorderCategories(
      reorderCategoriesDto,
      request.user.id,
    );
  }

  @ApiOperation({ summary: 'Update category for owner' })
  @ApiCookieAuth('gustio_session')
  @ApiParam({ name: 'categoryId', type: String, example: 'cat_1' })
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
  @Delete(':categoryId')
  deleteCategory(
    @Param('categoryId') categoryId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.categoriesService.deleteCategory(categoryId, request.user.id);
  }
}
