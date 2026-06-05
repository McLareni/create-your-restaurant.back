import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import { LiveCallsService } from './live-calls.service';
import type { AuthenticatedRequest } from '../restaurants/middleware/session-auth.middleware';

@Controller('restaurants/:restaurantId/live-calls')
export class LiveCallsController {
  constructor(private readonly liveCallsService: LiveCallsService) {}

  @Get()
  getActiveCalls(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.liveCallsService.getActiveCalls(restaurantId, request.user.id);
  }

  @Post('public/trigger')
  triggerCall(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Body() body: { tableId: string; type: 'WAITER' | 'BILL' },
  ) {
    return this.liveCallsService.triggerCallFromTable(
      restaurantId,
      body.tableId,
      body.type,
    );
  }

  @Delete(':callId')
  dismissCall(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('callId') callId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.liveCallsService.dismissCall(
      restaurantId,
      callId,
      request.user.id,
    );
  }
}
