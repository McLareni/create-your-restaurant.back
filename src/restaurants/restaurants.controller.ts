import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { RestaurantsService } from './restaurants.service';

@ApiTags('Restaurants')
@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

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
          ownerId: 1,
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
  create(@Body() createRestaurantDto: CreateRestaurantDto) {
    return this.restaurantsService.create(createRestaurantDto);
  }
}
