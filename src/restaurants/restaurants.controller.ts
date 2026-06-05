import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Req,
  Patch,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { RestaurantsService } from './restaurants.service';
import { CheckSlugDto } from './dto/ckeck-restaurant-slug.dto';
import type { AuthenticatedRequest } from './middleware/session-auth.middleware';

@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Post()
  async create(
    @Body() createRestaurantDto: CreateRestaurantDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.restaurantsService.create(createRestaurantDto, request.user.id);
  }

  @Post('upload-cover')
  @UseInterceptors(FileInterceptor('photo'))
  async uploadCover(@UploadedFile() file: any) {
    return this.restaurantsService.uploadCover(file);
  }

  @HttpCode(200)
  @Post('check-restaurant-slug')
  checkSlug(@Body() checkSlugDto: CheckSlugDto) {
    return this.restaurantsService.checkSlug(checkSlugDto.slug);
  }

  @Get(':id/access')
  async getAccess(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.restaurantsService.getAccess(id, request.user.id);
  }

  @Delete(':id')
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.restaurantsService.delete(id, request.user.id);
  }

  @Post(':id/modules/connect')
  async connectModule(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { moduleKey: string; activationCode?: string },
    @Req() request: AuthenticatedRequest,
  ) {
    return this.restaurantsService.connectModule(
      id,
      body.moduleKey,
      request.user.id,
    );
  }

  @Post(':id/modules/toggle')
  async toggleModule(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { moduleKey: string; isActive: boolean },
    @Req() request: AuthenticatedRequest,
  ) {
    return this.restaurantsService.toggleModule(
      id,
      body.moduleKey,
      body.isActive,
      request.user.id,
    );
  }
}
