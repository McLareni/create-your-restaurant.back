import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { AnalyticsService } from 'src/analytics/analytics.service';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { RequirePermission } from 'src/guards/permission.decorator';
import { PERMISSIONS } from 'src/common/constants/permissions.constants';

@Controller('restaurants/:restaurantId/analytics')
@UseGuards(PermissionsGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.ANALYTICS_READ)
  getSummary(@Param('restaurantId', ParseIntPipe) restaurantId: number) {
    return this.analyticsService.getSummary(restaurantId);
  }
}
