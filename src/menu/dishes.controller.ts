import { Body, Controller, Delete, Param, Patch, Post, Req, Get } from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../restaurants/middleware/session-auth.middleware';
import { CreateDishDto } from './dto/create-dish.dto';
import { UpdateDishDto } from './dto/update-dish.dto';
import { ReorderDishesDto } from './dto/reorder-dishes.dto';
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

  @ApiOperation({ summary: 'Get global dictionary tags lookups' })
  @ApiCookieAuth('gustio_session')
  @Get('dishes/lookups/tags')
  getTagsLookup() {
    return this.dishesService.getTagsLookup();
  }

  @ApiOperation({ summary: 'Get global dictionary allergens lookups' })
  @ApiCookieAuth('gustio_session')
  @Get('dishes/lookups/allergens')
  getAllergensLookup() {
    return this.dishesService.getAllergensLookup();
  }

  @ApiOperation({ summary: 'Delete custom tag from all dishes' })
  @ApiCookieAuth('gustio_session')
  @ApiParam({ name: 'tagName', type: String, example: 'Веган' })
  @Delete('dishes/lookups/tags/:tagName')
  deleteTagLookup(
    @Param('tagName') tagName: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.dishesService.deleteTagLookup(tagName, request.user.id);
  }

  @ApiOperation({ summary: 'Delete custom allergen from all dishes' })
  @ApiCookieAuth('gustio_session')
  @ApiParam({ name: 'allergenName', type: String, example: 'Глютен' })
  @Delete('dishes/lookups/allergens/:allergenName')
  deleteAllergenLookup(
    @Param('allergenName') allergenName: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.dishesService.deleteAllergenLookup(allergenName, request.user.id);
  }

  @ApiOperation({ summary: 'Create dish for owner' })
  @ApiCookieAuth('gustio_session')
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'categoryId', type: String, example: 'cat_1' })
  @ApiBody({ type: CreateDishDto })
  @ApiResponse({ status: 201, description: 'Dish created successfully' })
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
    return this.dishesService.createDish(categoryId, createDishDto, request.user.id);
  }

  @ApiOperation({ summary: 'Reorder dishes for owner' })
  @ApiCookieAuth('gustio_session')
  @ApiBody({ type: ReorderDishesDto })
  @ApiResponse({ status: 200, description: 'Dishes reordered successfully' })
  @Patch('dishes/reorder')
  reorderDishes(
    @Body() reorderDishesDto: ReorderDishesDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.dishesService.reorderDishes(reorderDishesDto, request.user.id);
  }

  @ApiOperation({ summary: 'Update dish for owner' })
  @ApiCookieAuth('gustio_session')
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'dishId', type: String, example: 'dish_1' })
  @ApiBody({ type: UpdateDishDto })
  @ApiResponse({ status: 200, description: 'Dish updated successfully' })
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
    return this.dishesService.updateDish(dishId, updateDishDto, request.user.id);
  }

  @ApiOperation({ summary: 'Delete dish for owner' })
  @ApiCookieAuth('gustio_session')
  @ApiParam({ name: 'dishId', type: String, example: 'dish_1' })
  @ApiResponse({ status: 200, description: 'Dish deleted successfully' })
  @Delete('dishes/:dishId')
  deleteDish(
    @Param('dishId') dishId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.dishesService.deleteDish(dishId, request.user.id);
  }
}