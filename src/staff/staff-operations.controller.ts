import {
  Controller,
  Post,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { StaffOperationsService } from 'src/staff/staff-operations.service';
import { AuthorizeVoidDto } from 'src/staff/dto/staff-operations.dto';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { RequirePermission } from 'src/guards/permission.decorator';
import { PERMISSIONS } from 'src/common/constants/permissions.constants';

@Controller('restaurants/:restaurantId/staff-ops')
@UseGuards(PermissionsGuard)
export class StaffOperationsController {
  constructor(private readonly opsService: StaffOperationsService) {}

  @Post('authorize-void')
  @RequirePermission(PERMISSIONS.ORDERS_MANAGE)
  authorizeVoid(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Body() body: AuthorizeVoidDto,
  ) {
    return this.opsService.authorizeVoid(
      restaurantId,
      body.pinCode,
      body.orderId,
    );
  }
}
