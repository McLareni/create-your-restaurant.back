import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { CreateInventoryItemDto, UpdateInventoryItemDto } from './dto/inventory.dto';
import type { AuthenticatedRequest } from '../restaurants/middleware/session-auth.middleware';

@ApiTags('Inventory')
@Controller('restaurants/:restaurantId/inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @ApiOperation({ summary: 'Get all inventory items' })
  @ApiCookieAuth('gustio_session')
  @Get()
  getAll(@Param('restaurantId', ParseIntPipe) restaurantId: number, @Req() request: AuthenticatedRequest) {
    return this.inventoryService.getAll(restaurantId, request.user.id);
  }

  @ApiOperation({ summary: 'Add item to inventory' })
  @ApiCookieAuth('gustio_session')
  @Post()
  create(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Body() dto: CreateInventoryItemDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.inventoryService.create(restaurantId, dto, request.user.id);
  }

  @ApiOperation({ summary: 'Update inventory stock or details' })
  @ApiCookieAuth('gustio_session')
  @Patch(':id')
  update(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('id') id: string,
    @Body() dto: UpdateInventoryItemDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.inventoryService.update(restaurantId, id, dto, request.user.id);
  }

  @ApiOperation({ summary: 'Delete inventory item' })
  @ApiCookieAuth('gustio_session')
  @Delete(':id')
  delete(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.inventoryService.delete(restaurantId, id, request.user.id);
  }
}