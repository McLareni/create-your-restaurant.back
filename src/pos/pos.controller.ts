import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Patch,
  Req,
} from '@nestjs/common';
import { PosService } from './pos.service';
import { ConnectPosDto, UpdatePosSettingsDto } from './dto/pos.dto';
import type { AuthenticatedRequest } from '../restaurants/middleware/session-auth.middleware';

@Controller('restaurants/:restaurantId/pos')
export class PosController {
  constructor(private readonly posService: PosService) {}

  @Get('status')
  getConnectionStatus(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.posService.getStatus(restaurantId, request.user.id);
  }

  @Post('connect')
  connect(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Body() dto: ConnectPosDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.posService.connect(restaurantId, dto, request.user.id);
  }

  @Patch('settings')
  updateSettings(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Body() dto: UpdatePosSettingsDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.posService.updateSettings(restaurantId, dto, request.user.id);
  }

  @Post('sync-menu')
  syncMenu(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.posService.syncMenu(restaurantId, request.user.id);
  }
}
