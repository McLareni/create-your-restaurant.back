import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  UploadedFiles,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiCookieAuth,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateDishDto } from 'src/menu/dto/create-dish.dto';
import { UpdateDishDto } from 'src/menu/dto/update-dish.dto';
import { ReorderDishesDto } from 'src/menu/dto/reorder-dishes.dto';
import { DishesService } from 'src/menu/dishes.service';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { RequirePermission } from 'src/guards/permission.decorator';
import { FileSignatureValidator } from 'src/common/validators/file-signature.validator';
import { ActiveRestaurantId } from 'src/common/decorators/active-restaurant-id.decorator';
import { PERMISSIONS } from 'src/common/constants/permissions.constants';
import { SessionAuthGuard } from 'src/guards/session-auth.guard';

type UploadedDishImage = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

@ApiTags('Dishes')
@Controller('menu/owner')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class DishesController {
  constructor(private readonly dishesService: DishesService) {}

  @ApiOperation({ summary: 'Create dish for owner' })
  @ApiCookieAuth('gustio_session')
  @ApiParam({ name: 'categoryId', type: String, example: 'cat_1' })
  @ApiBody({ type: CreateDishDto })
  @ApiResponse({ status: 201, description: 'Dish created successfully' })
  @RequirePermission(PERMISSIONS.MENU_CREATE)
  @Post('categories/:categoryId/dishes')
  createDish(
    @ActiveRestaurantId() restaurantId: number,
    @Param('categoryId') categoryId: string,
    @Body() createDishDto: CreateDishDto,
  ) {
    return this.dishesService.createDish(
      restaurantId,
      categoryId,
      createDishDto,
    );
  }

  @ApiOperation({ summary: 'Reorder dishes for owner' })
  @ApiCookieAuth('gustio_session')
  @ApiBody({ type: ReorderDishesDto })
  @ApiResponse({ status: 200, description: 'Dishes reordered successfully' })
  @RequirePermission(PERMISSIONS.MENU_UPDATE)
  @Patch('dishes/reorder')
  reorderDishes(
    @ActiveRestaurantId() restaurantId: number,
    @Body() reorderDishesDto: ReorderDishesDto,
  ) {
    return this.dishesService.reorderDishes(restaurantId, reorderDishesDto);
  }

  @ApiOperation({ summary: 'Update dish for owner' })
  @ApiCookieAuth('gustio_session')
  @ApiParam({ name: 'dishId', type: String, example: 'dish_1' })
  @ApiBody({ type: UpdateDishDto })
  @ApiResponse({ status: 200, description: 'Dish updated successfully' })
  @RequirePermission(PERMISSIONS.MENU_UPDATE)
  @Patch('dishes/:dishId')
  updateDish(
    @ActiveRestaurantId() restaurantId: number,
    @Param('dishId') dishId: string,
    @Body() updateDishDto: UpdateDishDto,
  ) {
    return this.dishesService.updateDish(restaurantId, dishId, updateDishDto);
  }

  @ApiOperation({ summary: 'Update dish photos' })
  @ApiCookieAuth('gustio_session')
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'dishId', type: String, example: 'dish_1' })
  @RequirePermission(PERMISSIONS.MENU_UPDATE)
  @Patch('dishes/:dishId/photos')
  @UseInterceptors(FilesInterceptor('photos', 10))
  updateDishPhotos(
    @ActiveRestaurantId() restaurantId: number,
    @Param('dishId') dishId: string,
    @Body('layout') layoutStr: string,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 5 * 1024 * 1024,
            message: 'errors.file_too_large',
          }),
          new FileSignatureValidator(),
        ],
        fileIsRequired: false,
      }),
    )
    files?: UploadedDishImage[],
  ) {
    let layout: { type: string; url?: string }[] = [];
    try {
      if (layoutStr) {
        layout = JSON.parse(layoutStr);
      }
    } catch {
      throw new BadRequestException('errors.invalid_layout_format');
    }
    return this.dishesService.updateDishPhotos(
      restaurantId,
      dishId,
      layout,
      files,
    );
  }

  @ApiOperation({ summary: 'Delete dish for owner' })
  @ApiCookieAuth('gustio_session')
  @ApiParam({ name: 'dishId', type: String, example: 'dish_1' })
  @ApiResponse({ status: 200, description: 'Dish deleted successfully' })
  @RequirePermission(PERMISSIONS.MENU_DELETE)
  @Delete('dishes/:dishId')
  deleteDish(
    @ActiveRestaurantId() restaurantId: number,
    @Param('dishId') dishId: string,
  ) {
    return this.dishesService.deleteDish(restaurantId, dishId);
  }
}
