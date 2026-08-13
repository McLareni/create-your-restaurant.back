import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { VisualService } from './visual.service';
import { UpdateVisualDto } from './dto/update-visual.dto';
import { SessionAuthGuard } from 'src/guards/session-auth.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { RequirePermission } from 'src/guards/permission.decorator';
import { PERMISSIONS } from 'src/common/constants/permissions.constants';

@ApiTags('Visual')
@ApiBearerAuth()
@UseGuards(SessionAuthGuard, PermissionsGuard)
@Controller('restaurants/:restaurantId/visual')
export class VisualController {
  constructor(private readonly visualService: VisualService) {}

  @Get()
  @RequirePermission(PERMISSIONS.VISUAL_MANAGE)
  getVisualSettings(@Param('restaurantId', ParseIntPipe) restaurantId: number) {
    return this.visualService.getVisualSettings(restaurantId);
  }

  @Patch()
  @RequirePermission(PERMISSIONS.VISUAL_MANAGE)
  updateVisualSettings(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Body() updateVisualDto: UpdateVisualDto,
  ) {
    return this.visualService.updateVisualSettings(
      restaurantId,
      updateVisualDto,
    );
  }
}
