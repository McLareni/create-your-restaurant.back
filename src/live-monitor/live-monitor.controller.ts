import { Controller, Get, Param, ParseIntPipe, Req } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../restaurants/middleware/session-auth.middleware';
import { LiveMonitorService } from './live-monitor.service';

@ApiTags('Live monitor')
@Controller('restaurants/:restaurantId/live-monitor')
export class LiveMonitorController {
  constructor(private readonly liveMonitorService: LiveMonitorService) {}

  @ApiOperation({
    summary: 'Get all tables with active orders for live monitor',
  })
  @ApiCookieAuth('gustio_session')
  @ApiParam({ name: 'restaurantId', type: Number, example: 1 })
  @Get('tables')
  getTablesWithActiveOrders(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.liveMonitorService.getTablesWithActiveOrders(
      restaurantId,
      request.user.id,
    );
  }
}
