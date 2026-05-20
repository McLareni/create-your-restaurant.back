import { Body, Controller, Get, Param, ParseIntPipe, Post, Req } from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiParam, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../restaurants/middleware/session-auth.middleware';
import { CreateMenuDto } from './dto/create-menu.dto';
import { MenuService } from './menu.service';

@ApiTags('Menu')
@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get('owner/:restaurantId')
  getMenuForOwner(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.menuService.getMenuForOwner(restaurantId, request.user.id);
  }

  @Get(':restaurantId')
  getMenu(@Param('restaurantId', ParseIntPipe) restaurantId: number) {
    return this.menuService.getMenu(restaurantId);
  }

  @Post()
  create(
    @Body() createMenuDto: CreateMenuDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.menuService.create(createMenuDto, request.user.id);
  }
}