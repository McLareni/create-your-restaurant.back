import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { PosService } from 'src/pos/pos.service';
import { ConnectPosDto, UpdatePosSettingsDto } from 'src/pos/dto/pos.dto';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { RequirePermission } from 'src/guards/permission.decorator';
import { ActiveRestaurantId } from 'src/common/decorators/active-restaurant-id.decorator';
import { PERMISSIONS } from 'src/common/constants/permissions.constants';
import { SessionAuthGuard } from 'src/guards/session-auth.guard';

@Controller('pos')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class PosController {
  constructor(private readonly posService: PosService) {}

  @Get('status')
  @RequirePermission(PERMISSIONS.POS_READ)
  getConnectionStatus(@ActiveRestaurantId() restaurantId: number) {
    return this.posService.getStatus(restaurantId);
  }

  @Post('connect')
  @RequirePermission(PERMISSIONS.POS_MANAGE)
  connect(
    @ActiveRestaurantId() restaurantId: number,
    @Body() dto: ConnectPosDto,
  ) {
    return this.posService.connect(restaurantId, dto);
  }

  @Patch('settings')
  @RequirePermission(PERMISSIONS.POS_MANAGE)
  updateSettings(
    @ActiveRestaurantId() restaurantId: number,
    @Body() dto: UpdatePosSettingsDto,
  ) {
    return this.posService.updateSettings(restaurantId, dto);
  }

  @Post('sync-menu')
  @RequirePermission(PERMISSIONS.POS_MANAGE)
  syncMenu(@ActiveRestaurantId() restaurantId: number) {
    return this.posService.syncMenu(restaurantId);
  }

  @Post('disconnect')
  @RequirePermission(PERMISSIONS.POS_MANAGE)
  disconnect(@ActiveRestaurantId() restaurantId: number) {
    return this.posService.disconnect(restaurantId);
  }
}
