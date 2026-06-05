import { Controller, Post, Param, Body, ParseIntPipe } from '@nestjs/common';
import { StaffOperationsService } from './staff-operations.service';
import { AuthorizeVoidDto } from './dto/staff-operations.dto';

@Controller('restaurants/:restaurantId/staff-ops')
export class StaffOperationsController {
  constructor(private readonly opsService: StaffOperationsService) {}

  @Post('authorize-void')
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
