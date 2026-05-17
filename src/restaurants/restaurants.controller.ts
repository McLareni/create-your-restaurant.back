import {
  Body,
  Controller,
  Post,
  BadRequestException,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { RestaurantsService } from './restaurants.service';
import { CheckSlugDto } from './dto/ckeck-restaurant-slug.dto';
import { UsersService } from '../users/users.service';

@ApiTags('Restaurants')
@Controller('restaurants')
export class RestaurantsController {
  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly usersService: UsersService,
  ) {}

  @ApiOperation({ summary: 'Create restaurant' })
  @ApiBody({ type: CreateRestaurantDto })
  @ApiResponse({
    status: 201,
    description: 'Restaurant created successfully',
    schema: {
      example: {
        message: 'Restaurant created successfully',
        restaurant: {
          id: 1,
          title: 'Pizza House',
          slug: 'pizza-house',
          type: 'CAFE',
          currency: 'USD',
          phoneNumber: '+380991112233',
          city: 'Kyiv',
          language: 'UA',
        },
      },
    },
  })
  @Post()
  async create(
    @Body() createRestaurantDto: CreateRestaurantDto,
    @Req() request: Request,
  ) {
    const token = (request.cookies as Record<string, string>)?.gustio_session;

    if (!token) {
      throw new BadRequestException('Session token is required');
    }

    const user = await this.usersService.validateSessionToken(token);

    return this.restaurantsService.create(createRestaurantDto, user.id);
  }

  @ApiOperation({ summary: 'Check restaurant slug availability' })
  @ApiBody({ type: CheckSlugDto })
  @ApiResponse({
    status: 200,
    description: 'Slug availability status',
    schema: {
      example: {
        isAvailable: true,
      },
    },
  })
  @Post('check-restaurant-slug')
  checkSlug(@Body() checkSlugDto: CheckSlugDto) {
    return this.restaurantsService.checkSlug(checkSlugDto.slug);
  }
}
