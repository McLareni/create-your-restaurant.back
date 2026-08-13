import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { LiveMonitorGateway } from 'src/live-monitor/live-monitor.gateway';
import { LiveMonitorService } from 'src/live-monitor/live-monitor.service';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { SessionAuthGuard } from 'src/guards/session-auth.guard';
import { RequirePermission } from 'src/guards/permission.decorator';
import { PERMISSIONS } from 'src/common/constants/permissions.constants';

@ApiTags('Live monitor')
@Controller('restaurants/:restaurantId/live-monitor')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class LiveMonitorController {
  constructor(
    private readonly liveMonitorService: LiveMonitorService,
    private readonly liveMonitorGateway: LiveMonitorGateway,
  ) {}

  @ApiOperation({
    summary: 'Get all tables with active orders for live monitor',
  })
  @ApiCookieAuth('gustio_session')
  @ApiParam({ name: 'restaurantId', type: Number, example: 1 })
  @Get('tables')
  @RequirePermission(PERMISSIONS.LIVE_READ)
  getTablesWithActiveOrders(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
  ) {
    return this.liveMonitorService.getTablesWithActiveOrders(restaurantId);
  }

  @ApiOperation({ summary: 'Get single table active orders snapshot' })
  @Get('tables/:tableId')
  @RequirePermission(PERMISSIONS.LIVE_READ)
  async getSingleTableSnapshot(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('tableId') tableId: string,
  ) {
    return this.liveMonitorService.getSingleTableSnapshot(
      restaurantId,
      tableId,
    );
  }

  @ApiOperation({ summary: 'Get completed/canceled orders for a given date' })
  @Get('history')
  @RequirePermission(PERMISSIONS.LIVE_READ)
  async getHistorySnapshot(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Query('date') dateParam?: string,
  ) {
    return this.liveMonitorService.getHistorySnapshot(restaurantId, dateParam);
  }
}
