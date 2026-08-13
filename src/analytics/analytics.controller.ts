import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { GetAnalyticsDto } from 'src/analytics/dto/get-analytics.dto';
import { AnalyticsService } from 'src/analytics/analytics.service';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { RequirePermission } from 'src/guards/permission.decorator';
import { PERMISSIONS } from 'src/common/constants/permissions.constants';
import { SessionAuthGuard } from 'src/guards/session-auth.guard';

@Controller('restaurants/:restaurantId/analytics')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.ANALYTICS_READ)
  getSummary(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: GetAnalyticsDto,
  ) {
    return this.analyticsService.getSummary(
      restaurantId,
      query.startDate,
      query.endDate,
    );
  }
}
