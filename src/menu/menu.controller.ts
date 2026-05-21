import { Body, Controller, Get, Param, ParseIntPipe, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateMenuDto } from './dto/create-menu.dto';
import { MenuService } from './menu.service';

@ApiTags('Menu')
@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get(':restaurantId')
  getMenu(@Param('restaurantId', ParseIntPipe) restaurantId: number) {
    return this.menuService.getMenu(restaurantId);
  }

  @Post()
  create(
    @Body() createMenuDto: CreateMenuDto,
    @Req() request: any,
  ) {
    return this.menuService.create(createMenuDto, request.user.id);
  }
}