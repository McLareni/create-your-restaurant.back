import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Delete,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { LiveCallsService } from './live-calls.service';
import { TriggerCallDto } from './dto/trigger-call.dto';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { SessionAuthGuard } from 'src/guards/session-auth.guard';
import { RequirePermission } from 'src/guards/permission.decorator';
import { PERMISSIONS } from 'src/common/constants/permissions.constants';
import { LiveMonitorGateway } from 'src/live-monitor/live-monitor.gateway';

@ApiTags('Live calls')
@Controller('restaurants/:restaurantId/live-calls')
export class LiveCallsController {
  constructor(
    private readonly liveCallsService: LiveCallsService,
    private readonly liveMonitorGateway: LiveMonitorGateway,
  ) {}

  @ApiOperation({ summary: 'Get all active calls for a restaurant' })
  @ApiCookieAuth('gustio_session')
  @ApiParam({ name: 'restaurantId', type: Number, example: 1 })
  @Get()
  @UseGuards(SessionAuthGuard, PermissionsGuard)
  @RequirePermission(PERMISSIONS.LIVE_READ)
  async getActiveCalls(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
  ) {
    return this.liveCallsService.getActiveCalls(restaurantId);
  }

  @ApiOperation({ summary: 'Dismiss a waiter call' })
  @ApiCookieAuth('gustio_session')
  @ApiParam({ name: 'restaurantId', type: Number, example: 1 })
  @ApiParam({
    name: 'callId',
    type: String,
    description: 'The ID of the call (which is the tableId)',
  })
  @ApiResponse({
    status: 200,
    description: 'Waiter call resolved successfully',
  })
  @Delete(':callId')
  @UseGuards(SessionAuthGuard, PermissionsGuard)
  @RequirePermission(PERMISSIONS.LIVE_RESOLVE)
  async dismissCall(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('callId') tableId: string,
  ) {
    const result = await this.liveCallsService.dismissCall(
      restaurantId,
      tableId,
    );
    await this.liveMonitorGateway.emitOrdersChanged(
      restaurantId,
      'updated',
      tableId,
      tableId,
    );
    return result;
  }

  @ApiOperation({ summary: 'Trigger a waiter call from public menu' })
  @ApiParam({ name: 'restaurantId', type: Number, example: 1 })
  @Post('public/trigger')
  async triggerPublicCall(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Body() data: TriggerCallDto,
  ) {
    const result = await this.liveCallsService.triggerPublicCall(
      restaurantId,
      data,
    );
    await this.liveMonitorGateway.emitOrdersChanged(
      restaurantId,
      'updated',
      data.tableId,
      data.tableId,
    );
    return result;
  }
}
