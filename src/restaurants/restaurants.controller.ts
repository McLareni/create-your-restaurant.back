import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Patch,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { CreateRestaurantDto } from 'src/restaurants/dto/create-restaurant.dto';
import { CheckSlugDto } from 'src/restaurants/dto/ckeck-restaurant-slug.dto';
import { ReorderRestaurantsDto } from 'src/restaurants/dto/reorder-restaurants.dto';
import { ConnectModuleDto } from 'src/restaurants/dto/connect-module.dto';
import { ToggleModuleDto } from 'src/restaurants/dto/toggle-module.dto';
import { RestaurantsService } from 'src/restaurants/restaurants.service';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { SessionAuthGuard } from 'src/guards/session-auth.guard';
import { RequirePermission } from 'src/guards/permission.decorator';
import { FileSignatureValidator } from 'src/common/validators/file-signature.validator';
import { CurrentUser } from 'src/users/decorators/current-user.decorator';
import type { User } from '@prisma/client';
import type { UploadedStaffImage } from 'src/cloudinary/cloudinary.service';

@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Post()
  @UseGuards(SessionAuthGuard)
  async create(
    @Body() createRestaurantDto: CreateRestaurantDto,
    @CurrentUser() user: User,
  ) {
    return await this.restaurantsService.create(createRestaurantDto, user.id);
  }

  @Patch('reorder')
  @UseGuards(SessionAuthGuard)
  async reorder(@Body() dto: ReorderRestaurantsDto, @CurrentUser() user: User) {
    return await this.restaurantsService.reorder(dto.ids, user.id);
  }

  @Post('upload-cover')
  @UseGuards(SessionAuthGuard)
  @UseInterceptors(FileInterceptor('photo'))
  async uploadCover(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10485760 }),
          new FileSignatureValidator(),
        ],
      }),
    )
    file: UploadedStaffImage,
  ) {
    return await this.restaurantsService.uploadCover(file);
  }

  @HttpCode(200)
  @Post('check-restaurant-slug')
  checkSlug(@Body() checkSlugDto: CheckSlugDto) {
    return this.restaurantsService.checkSlug(checkSlugDto.slug);
  }

  @Get(':restaurantId/access')
  @UseGuards(SessionAuthGuard, PermissionsGuard)
  async getAccess(
    @Param('restaurantId', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return await this.restaurantsService.getAccess(id, user.id);
  }

  @Delete(':restaurantId')
  @UseGuards(SessionAuthGuard, PermissionsGuard)
  @RequirePermission('owner')
  async delete(
    @Param('restaurantId', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return await this.restaurantsService.delete(id, user.id);
  }

  @Post(':restaurantId/modules/connect')
  @UseGuards(SessionAuthGuard, PermissionsGuard)
  @RequirePermission('owner')
  async connectModule(
    @Param('restaurantId', ParseIntPipe) id: number,
    @Body() body: ConnectModuleDto,
    @CurrentUser() user: User,
  ) {
    return await this.restaurantsService.connectModule(
      id,
      body.moduleKey,
      body.activationCode,
      user.id,
    );
  }

  @Post(':restaurantId/modules/toggle')
  @UseGuards(SessionAuthGuard, PermissionsGuard)
  @RequirePermission('owner')
  async toggleModule(
    @Param('restaurantId', ParseIntPipe) id: number,
    @Body() body: ToggleModuleDto,
    @CurrentUser() user: User,
  ) {
    return await this.restaurantsService.toggleModule(
      id,
      body.moduleKey,
      body.isActive,
      user.id,
    );
  }
}
