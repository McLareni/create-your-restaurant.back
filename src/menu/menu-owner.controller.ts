import { Controller, Get, Post, Patch, Param, Body, ParseIntPipe } from '@nestjs/common';
import { MenuOwnerService } from './menu-owner.service';
import { CreateDishDto } from './dto/create-dish.dto';

@Controller('menu/owner')
export class MenuOwnerController {
  constructor(private readonly menuOwnerService: MenuOwnerService) {}

  @Get(':restaurantId')
  async getFullMenu(@Param('restaurantId', ParseIntPipe) restaurantId: number) {
    return this.menuOwnerService.getFullMenu(restaurantId);
  }

  @Post('categories/:categoryId/dishes')
  async createDish(
    @Param('categoryId') categoryId: string,
    @Body() createDishDto: CreateDishDto,
  ) {
    const dish = await this.menuOwnerService.createDish(categoryId, createDishDto);
    return { message: 'Dish created successfully', dish };
  }

  @Patch('dishes/:dishId')
  async updateDish(
    @Param('dishId') dishId: string,
    @Body() updateDishDto: CreateDishDto,
  ) {
    const dish = await this.menuOwnerService.updateDish(dishId, updateDishDto);
    return { message: 'Dish updated successfully', dish };
  }
}