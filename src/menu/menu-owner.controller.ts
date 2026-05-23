import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { MenuOwnerService } from './menu-owner.service';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Menu Owner')
@Controller('menu/owner')
export class MenuOwnerController {
  constructor(private readonly menuOwnerService: MenuOwnerService) {}

  @ApiOperation({ summary: 'Get full menu for owner' })
  @ApiCookieAuth('gustio_session')
  @Get(':restaurantId')
  async getFullMenu(@Param('restaurantId', ParseIntPipe) restaurantId: number) {
    return this.menuOwnerService.getFullMenu(restaurantId);
  }
}
