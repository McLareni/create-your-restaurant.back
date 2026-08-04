import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  Get,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MenuOwnerService } from 'src/menu/menu-owner.service';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { RequirePermission } from 'src/guards/permission.decorator';
import { ActiveRestaurantId } from 'src/common/decorators/active-restaurant-id.decorator';
import { CreateLookupDto } from 'src/menu/dto/create-lookup.dto';
import { PERMISSIONS } from 'src/common/constants/permissions.constants';

@ApiTags('Menu Owner')
@Controller('menu/owner')
@UseGuards(PermissionsGuard)
export class MenuOwnerController {
  constructor(private readonly menuOwnerService: MenuOwnerService) {}

  @ApiOperation({ summary: 'Get full menu for owner' })
  @ApiCookieAuth('gustio_session')
  @RequirePermission(PERMISSIONS.MENU_READ)
  @Get()
  getFullMenu(@ActiveRestaurantId() restaurantId: number) {
    return this.menuOwnerService.getFullMenu(restaurantId);
  }

  @ApiOperation({ summary: 'Get tags lookup for restaurant' })
  @ApiCookieAuth('gustio_session')
  @RequirePermission(PERMISSIONS.MENU_READ)
  @Get('dishes/lookups/tags')
  getTagsLookup(@ActiveRestaurantId() restaurantId: number) {
    return this.menuOwnerService.getTagsLookup(restaurantId);
  }

  @ApiOperation({ summary: 'Get allergens lookup for restaurant' })
  @ApiCookieAuth('gustio_session')
  @RequirePermission(PERMISSIONS.MENU_READ)
  @Get('dishes/lookups/allergens')
  getAllergensLookup(@ActiveRestaurantId() restaurantId: number) {
    return this.menuOwnerService.getAllergensLookup(restaurantId);
  }

  @ApiOperation({ summary: 'Create global tag for restaurant' })
  @ApiCookieAuth('gustio_session')
  @RequirePermission(PERMISSIONS.MENU_CREATE)
  @Post('dishes/lookups/tags')
  createTagLookup(
    @ActiveRestaurantId() restaurantId: number,
    @Body() body: CreateLookupDto,
  ) {
    return this.menuOwnerService.createTagLookup(restaurantId, body.name);
  }

  @ApiOperation({ summary: 'Create global allergen for restaurant' })
  @ApiCookieAuth('gustio_session')
  @RequirePermission(PERMISSIONS.MENU_CREATE)
  @Post('dishes/lookups/allergens')
  createAllergenLookup(
    @ActiveRestaurantId() restaurantId: number,
    @Body() body: CreateLookupDto,
  ) {
    return this.menuOwnerService.createAllergenLookup(restaurantId, body.name);
  }

  @ApiOperation({ summary: 'Delete global tag from restaurant lookup' })
  @ApiCookieAuth('gustio_session')
  @RequirePermission(PERMISSIONS.MENU_DELETE)
  @Delete('dishes/lookups/tags/:name')
  deleteTagLookup(
    @ActiveRestaurantId() restaurantId: number,
    @Param('name') name: string,
  ) {
    return this.menuOwnerService.deleteTagLookup(restaurantId, name);
  }

  @ApiOperation({ summary: 'Delete global allergen from restaurant lookup' })
  @ApiCookieAuth('gustio_session')
  @RequirePermission(PERMISSIONS.MENU_DELETE)
  @Delete('dishes/lookups/allergens/:name')
  deleteAllergenLookup(
    @ActiveRestaurantId() restaurantId: number,
    @Param('name') name: string,
  ) {
    return this.menuOwnerService.deleteAllergenLookup(restaurantId, name);
  }
}
