import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Req,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../restaurants/middleware/session-auth.middleware';
import { LiveMonitorGateway } from './live-monitor.gateway';
import { LiveMonitorService } from './live-monitor.service';

@ApiTags('Live monitor')
@Controller('restaurants/:restaurantId/live-monitor')
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
  getTablesWithActiveOrders(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.liveMonitorService.getTablesWithActiveOrders(
      restaurantId,
      request.user.id,
    );
  }

  @ApiOperation({
    summary: 'Resolve waiter call for a table',
  })
  @ApiCookieAuth('gustio_session')
  @ApiParam({ name: 'restaurantId', type: Number, example: 1 })
  @ApiParam({
    name: 'tableId',
    type: String,
    example: '1a2d7d9c-5f73-4bf0-b89a-f12474a584d3',
  })
  @ApiBody({ required: false, schema: { example: {} } })
  @ApiResponse({
    status: 200,
    description: 'Waiter call resolved successfully',
  })
  @Patch('tables/:tableId/waiter-call/resolve')
  async resolveWaiterCall(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('tableId') tableId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const result = await this.liveMonitorService.resolveWaiterCall(
      restaurantId,
      tableId,
      request.user.id,
    );

    await this.liveMonitorGateway.emitOrdersChanged(
      restaurantId,
      'updated',
      tableId,
    );

    return result;
  }
}
