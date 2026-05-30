import { Controller, Get, Post, Delete, Param, Body, ParseIntPipe, Req } from '@nestjs/common';
import { MenuOwnerService } from './menu-owner.service';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../restaurants/middleware/session-auth.middleware';

@ApiTags('Menu Owner')
@Controller('menu/owner')
export class MenuOwnerController {
  constructor(private readonly menuOwnerService: MenuOwnerService) {}

  @ApiOperation({ summary: 'Get full menu for owner' })
  @ApiCookieAuth('gustio_session')
  @Get(':restaurantId')
  async getFullMenu(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.menuOwnerService.getFullMenu(restaurantId, request.user.id);
  }

  @ApiOperation({ summary: 'Get tags lookup for restaurant' })
  @ApiCookieAuth('gustio_session')
  @Get(':restaurantId/dishes/lookups/tags')
  async getTagsLookup(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.menuOwnerService.getTagsLookup(restaurantId, request.user.id);
  }

  @ApiOperation({ summary: 'Get allergens lookup for restaurant' })
  @ApiCookieAuth('gustio_session')
  @Get(':restaurantId/dishes/lookups/allergens')
  async getAllergensLookup(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.menuOwnerService.getAllergensLookup(restaurantId, request.user.id);
  }

  @ApiOperation({ summary: 'Create global tag for restaurant' })
  @ApiCookieAuth('gustio_session')
  @Post(':restaurantId/dishes/lookups/tags')
  async createTagLookup(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Body() body: { name: string },
    @Req() request: AuthenticatedRequest,
  ) {
    return this.menuOwnerService.createTagLookup(restaurantId, body.name, request.user.id);
  }

  @ApiOperation({ summary: 'Create global allergen for restaurant' })
  @ApiCookieAuth('gustio_session')
  @Post(':restaurantId/dishes/lookups/allergens')
  async createAllergenLookup(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Body() body: { name: string },
    @Req() request: AuthenticatedRequest,
  ) {
    return this.menuOwnerService.createAllergenLookup(restaurantId, body.name, request.user.id);
  }

  @ApiOperation({ summary: 'Delete global tag from restaurant lookup' })
  @ApiCookieAuth('gustio_session')
  @Delete(':restaurantId/dishes/lookups/tags/:name')
  async deleteTagLookup(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('name') name: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.menuOwnerService.deleteTagLookup(restaurantId, name, request.user.id);
  }

  @ApiOperation({ summary: 'Delete global allergen from restaurant lookup' })
  @ApiCookieAuth('gustio_session')
  @Delete(':restaurantId/dishes/lookups/allergens/:name')
  async deleteAllergenLookup(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('name') name: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.menuOwnerService.deleteAllergenLookup(restaurantId, name, request.user.id);
  }
}