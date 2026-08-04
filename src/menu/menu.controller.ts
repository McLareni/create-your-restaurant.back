import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MenuService } from 'src/menu/menu.service';

@ApiTags('Menu')
@Controller('restaurants/:restaurantId/menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get('slug/:slug')
  getMenuBySlug(@Param('slug') slug: string) {
    return this.menuService.getMenuBySlug(slug);
  }

  @Get()
  getMenu(@Param('restaurantId', ParseIntPipe) restaurantId: number) {
    return this.menuService.getMenu(restaurantId);
  }
}
