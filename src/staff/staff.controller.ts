import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { CreateStaffRoleDto } from './dto/create-staff-role.dto';
import { StaffService } from './staff.service';
import type { AuthenticatedRequest } from '../restaurants/middleware/session-auth.middleware';

@Controller('restaurants/:restaurantId')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post('staff/roles')
  createRole(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Body() createStaffRoleDto: CreateStaffRoleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.staffService.createStaffRole(
      restaurantId,
      createStaffRoleDto,
      req.user.id,
    );
  }

  @Get('staff/roles')
  getRoles(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.staffService.getStaffRoles(restaurantId, req.user.id);
  }

  @Delete('staff/roles/:roleId')
  deleteRole(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('roleId') roleId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.staffService.deleteStaffRole(restaurantId, roleId, req.user.id);
  }

  @Post('staff')
  createStaff(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Body() createStaffDto: CreateStaffDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.staffService.createStaff(
      restaurantId,
      createStaffDto,
      req.user.id,
    );
  }

  @Get('staff')
  getStaffList(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.staffService.getStaffList(restaurantId, req.user.id);
  }

  @Patch('staff/:staffId')
  updateStaff(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('staffId') staffId: string,
    @Body() updateStaffDto: UpdateStaffDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.staffService.updateStaff(
      restaurantId,
      staffId,
      updateStaffDto,
      req.user.id,
    );
  }

  @Delete('staff/:staffId')
  deleteStaff(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('staffId') staffId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.staffService.deleteStaff(restaurantId, staffId, req.user.id);
  }

  @Patch('staff/:staffId/photo')
  @UseInterceptors(FileInterceptor('photo'))
  uploadPhoto(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('staffId') staffId: string,
    @UploadedFile() file: any,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.staffService.uploadStaffPhoto(
      restaurantId,
      staffId,
      req.user.id,
      file,
    );
  }
}
