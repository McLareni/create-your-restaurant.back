import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
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
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { StaffService } from './staff.service';

@ApiTags('Staff')
@Controller('restaurants/:restaurantId/staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @ApiOperation({ summary: 'Create staff member' })
  @ApiCookieAuth('gustio_session')
  @ApiParam({ name: 'restaurantId', type: Number, example: 1 })
  @ApiBody({ type: CreateStaffDto })
  @ApiResponse({ status: 201, description: 'Staff created successfully' })
  @ApiResponse({ status: 400, description: 'Session token is required' })
  @ApiResponse({ status: 401, description: 'Invalid or expired session token' })
  @ApiResponse({ status: 404, description: 'Restaurant not found' })
  @Post()
  createStaff(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Body() createStaffDto: CreateStaffDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.staffService.createStaff(
      restaurantId,
      createStaffDto,
      request.user.id,
    );
  }

  @ApiOperation({ summary: 'Get all staff members for restaurant' })
  @ApiCookieAuth('gustio_session')
  @ApiParam({ name: 'restaurantId', type: Number, example: 1 })
  @ApiResponse({ status: 200, description: 'Staff list fetched successfully' })
  @ApiResponse({ status: 400, description: 'Session token is required' })
  @ApiResponse({ status: 401, description: 'Invalid or expired session token' })
  @ApiResponse({ status: 404, description: 'Restaurant not found' })
  @Get()
  getStaffList(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.staffService.getStaffList(restaurantId, request.user.id);
  }

  @ApiOperation({ summary: 'Update staff member' })
  @ApiCookieAuth('gustio_session')
  @ApiParam({ name: 'restaurantId', type: Number, example: 1 })
  @ApiParam({ name: 'staffId', type: String, example: 'uuid-string' })
  @ApiBody({ type: UpdateStaffDto })
  @ApiResponse({ status: 200, description: 'Staff updated successfully' })
  @ApiResponse({ status: 400, description: 'Session token is required' })
  @ApiResponse({ status: 401, description: 'Invalid or expired session token' })
  @ApiResponse({ status: 404, description: 'Staff member not found' })
  @Patch(':staffId')
  updateStaff(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('staffId') staffId: string,
    @Body() updateStaffDto: UpdateStaffDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.staffService.updateStaff(
      restaurantId,
      staffId,
      updateStaffDto,
      request.user.id,
    );
  }

  @ApiOperation({ summary: 'Delete staff member' })
  @ApiCookieAuth('gustio_session')
  @ApiParam({ name: 'restaurantId', type: Number, example: 1 })
  @ApiParam({ name: 'staffId', type: String, example: 'uuid-string' })
  @ApiResponse({ status: 200, description: 'Staff deleted successfully' })
  @ApiResponse({ status: 400, description: 'Session token is required' })
  @ApiResponse({ status: 401, description: 'Invalid or expired session token' })
  @ApiResponse({ status: 404, description: 'Staff member not found' })
  @Delete(':staffId')
  deleteStaff(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('staffId') staffId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.staffService.deleteStaff(
      restaurantId,
      staffId,
      request.user.id,
    );
  }
}
