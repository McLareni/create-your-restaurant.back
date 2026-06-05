import { Controller, Get, Param, ParseIntPipe, Req } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import type { AuthenticatedRequest } from '../restaurants/middleware/session-auth.middleware';

@Controller('restaurants/:restaurantId/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  getSummary(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.analyticsService.getSummary(restaurantId, request.user.id);
  }
}
