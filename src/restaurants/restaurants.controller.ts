import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { RestaurantsService } from './restaurants.service';
import { CheckSlugDto } from './dto/ckeck-restaurant-slug.dto';
import type { AuthenticatedRequest } from './middleware/session-auth.middleware';

@ApiTags('Restaurants')
@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @ApiOperation({ summary: 'Create restaurant' })
  @ApiCookieAuth('gustio_session')
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
          ownerId: 1,
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Session token is required' })
  @ApiResponse({ status: 401, description: 'Invalid or expired session token' })
  @Post()
  async create(
    @Body() createRestaurantDto: CreateRestaurantDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.restaurantsService.create(createRestaurantDto, request.user.id);
  }

  @ApiOperation({ summary: 'Check restaurant slug availability' })
  @ApiCookieAuth('gustio_session')
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
  @ApiResponse({ status: 400, description: 'Session token is required' })
  @ApiResponse({ status: 401, description: 'Invalid or expired session token' })
  @HttpCode(200)
  @Post('check-restaurant-slug')
  checkSlug(@Body() checkSlugDto: CheckSlugDto) {
    return this.restaurantsService.checkSlug(checkSlugDto.slug);
  }
}
