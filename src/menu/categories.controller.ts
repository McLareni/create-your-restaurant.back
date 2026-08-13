import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { RequirePermission } from 'src/guards/permission.decorator';
import { CategoriesService } from 'src/menu/categories.service';
import { CreateCategoryDto } from 'src/menu/dto/create-category.dto';
import { UpdateCategoryDto } from 'src/menu/dto/update-category.dto';
import { ReorderCategoriesDto } from 'src/menu/dto/reorder-categories.dto';
import { ActiveRestaurantId } from 'src/common/decorators/active-restaurant-id.decorator';
import { PERMISSIONS } from 'src/common/constants/permissions.constants';
import { SessionAuthGuard } from 'src/guards/session-auth.guard';

@ApiTags('Categories')
@Controller('menu/owner/categories')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @ApiOperation({ summary: 'Create category for owner' })
  @ApiCookieAuth('gustio_session')
  @RequirePermission(PERMISSIONS.MENU_CREATE)
  @Post()
  createCategory(
    @ActiveRestaurantId() restaurantId: number,
    @Body() createCategoryDto: CreateCategoryDto,
  ) {
    return this.categoriesService.createCategory(
      restaurantId,
      createCategoryDto,
    );
  }

  @ApiOperation({ summary: 'Reorder categories for owner' })
  @ApiCookieAuth('gustio_session')
  @ApiBody({ type: ReorderCategoriesDto })
  @ApiResponse({
    status: 200,
    description: 'Categories reordered successfully',
  })
  @RequirePermission(PERMISSIONS.MENU_UPDATE)
  @Patch('reorder')
  reorderCategories(
    @ActiveRestaurantId() restaurantId: number,
    @Body() reorderCategoriesDto: ReorderCategoriesDto,
  ) {
    return this.categoriesService.reorderCategories(
      restaurantId,
      reorderCategoriesDto,
    );
  }

  @ApiOperation({ summary: 'Update category for owner' })
  @ApiCookieAuth('gustio_session')
  @ApiParam({ name: 'categoryId', type: String, example: 'cat_1' })
  @RequirePermission(PERMISSIONS.MENU_UPDATE)
  @Patch(':categoryId')
  updateCategory(
    @ActiveRestaurantId() restaurantId: number,
    @Param('categoryId') categoryId: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoriesService.updateCategory(
      restaurantId,
      categoryId,
      updateCategoryDto,
    );
  }

  @ApiOperation({ summary: 'Delete category for owner' })
  @ApiCookieAuth('gustio_session')
  @ApiParam({ name: 'categoryId', type: String, example: 'cat_1' })
  @RequirePermission(PERMISSIONS.MENU_DELETE)
  @Delete(':categoryId')
  deleteCategory(
    @ActiveRestaurantId() restaurantId: number,
    @Param('categoryId') categoryId: string,
  ) {
    return this.categoriesService.deleteCategory(restaurantId, categoryId);
  }
}
