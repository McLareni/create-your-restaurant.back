import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InventoryService } from 'src/inventory/inventory.service';
import {
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
} from 'src/inventory/dto/inventory.dto';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { RequirePermission } from 'src/guards/permission.decorator';
import { ActiveRestaurantId } from 'src/common/decorators/active-restaurant-id.decorator';
import { PERMISSIONS } from 'src/common/constants/permissions.constants';

@ApiTags('Inventory')
@Controller('inventory')
@UseGuards(PermissionsGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @ApiOperation({ summary: 'Get all inventory items' })
  @ApiCookieAuth('gustio_session')
  @RequirePermission(PERMISSIONS.INVENTORY_READ)
  @Get()
  getAll(@ActiveRestaurantId() restaurantId: number) {
    return this.inventoryService.getAll(restaurantId);
  }

  @ApiOperation({ summary: 'Add item to inventory' })
  @ApiCookieAuth('gustio_session')
  @RequirePermission(PERMISSIONS.INVENTORY_MANAGE)
  @Post()
  create(
    @ActiveRestaurantId() restaurantId: number,
    @Body() dto: CreateInventoryItemDto,
  ) {
    return this.inventoryService.create(restaurantId, dto);
  }

  @ApiOperation({ summary: 'Update inventory stock or details' })
  @ApiCookieAuth('gustio_session')
  @RequirePermission(PERMISSIONS.INVENTORY_MANAGE)
  @Patch(':id')
  update(
    @ActiveRestaurantId() restaurantId: number,
    @Param('id') id: string,
    @Body() dto: UpdateInventoryItemDto,
  ) {
    return this.inventoryService.update(restaurantId, id, dto);
  }

  @ApiOperation({ summary: 'Delete inventory item' })
  @ApiCookieAuth('gustio_session')
  @RequirePermission(PERMISSIONS.INVENTORY_MANAGE)
  @Delete(':id')
  delete(@ActiveRestaurantId() restaurantId: number, @Param('id') id: string) {
    return this.inventoryService.delete(restaurantId, id);
  }
}
