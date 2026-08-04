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
  Req,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';
import { CreateRestaurantDto } from 'src/restaurants/dto/create-restaurant.dto';
import { CheckSlugDto } from 'src/restaurants/dto/ckeck-restaurant-slug.dto';
import { ReorderRestaurantsDto } from 'src/restaurants/dto/reorder-restaurants.dto';
import { RestaurantsService } from 'src/restaurants/restaurants.service';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { RequirePermission } from 'src/guards/permission.decorator';
import { FileSignatureValidator } from 'src/common/validators/file-signature.validator';
import type { AuthenticatedRequest } from 'src/restaurants/middleware/session-auth.middleware';
import type { UploadedStaffImage } from 'src/cloudinary/cloudinary.service';

export class ConnectModuleDto {
  @IsString({ message: 'errors.validation_string' })
  @IsNotEmpty({ message: 'errors.validation_required' })
  moduleKey!: string;

  @IsString({ message: 'errors.validation_string' })
  @IsOptional()
  activationCode?: string;
}

export class ToggleModuleDto {
  @IsString({ message: 'errors.validation_string' })
  @IsNotEmpty({ message: 'errors.validation_required' })
  moduleKey!: string;

  @IsBoolean({ message: 'errors.validation_boolean' })
  isActive!: boolean;
}

@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Post()
  async create(
    @Body() createRestaurantDto: CreateRestaurantDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return await this.restaurantsService.create(
      createRestaurantDto,
      request.user.id,
    );
  }

  @Patch('reorder')
  async reorder(
    @Body() dto: ReorderRestaurantsDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return await this.restaurantsService.reorder(dto.ids, request.user.id);
  }

  @Post('upload-cover')
  @UseInterceptors(FileInterceptor('photo'))
  async uploadCover(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5242880 }),
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
  @UseGuards(PermissionsGuard)
  async getAccess(
    @Param('restaurantId', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return await this.restaurantsService.getAccess(id, request.user.id);
  }

  @Delete(':restaurantId')
  @UseGuards(PermissionsGuard)
  @RequirePermission('owner')
  async delete(
    @Param('restaurantId', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return await this.restaurantsService.delete(id, request.user.id);
  }

  @Post(':restaurantId/modules/connect')
  @UseGuards(PermissionsGuard)
  @RequirePermission('owner')
  async connectModule(
    @Param('restaurantId', ParseIntPipe) id: number,
    @Body() body: ConnectModuleDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return await this.restaurantsService.connectModule(
      id,
      body.moduleKey,
      request.user.id,
    );
  }

  @Post(':restaurantId/modules/toggle')
  @UseGuards(PermissionsGuard)
  @RequirePermission('owner')
  async toggleModule(
    @Param('restaurantId', ParseIntPipe) id: number,
    @Body() body: ToggleModuleDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return await this.restaurantsService.toggleModule(
      id,
      body.moduleKey,
      body.isActive,
      request.user.id,
    );
  }
}
