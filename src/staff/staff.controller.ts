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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { CreateStaffRoleDto } from './dto/create-staff-role.dto';
import { StaffService } from './staff.service';

@Controller('restaurants/:restaurantId')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post('staff/roles')
  createRole(
    @Param('restaurantId') restaurantId: string,
    @Body() createStaffRoleDto: CreateStaffRoleDto,
    @Req() req: any,
  ) {
    return this.staffService.createStaffRole(Number(restaurantId), createStaffRoleDto, req.user.id);
  }

  @Get('staff/roles')
  getRoles(@Param('restaurantId') restaurantId: string, @Req() req: any) {
    return this.staffService.getStaffRoles(Number(restaurantId), req.user.id);
  }

  @Delete('staff/roles/:roleId')
  deleteRole(
    @Param('restaurantId') restaurantId: string,
    @Param('roleId') roleId: string,
    @Req() req: any,
  ) {
    return this.staffService.deleteStaffRole(Number(restaurantId), roleId, req.user.id);
  }

  @Post('staff')
  createStaff(
    @Param('restaurantId') restaurantId: string,
    @Body() createStaffDto: CreateStaffDto,
    @Req() req: any,
  ) {
    return this.staffService.createStaff(Number(restaurantId), createStaffDto, req.user.id);
  }

  @Get('staff')
  getStaffList(@Param('restaurantId') restaurantId: string, @Req() req: any) {
    return this.staffService.getStaffList(Number(restaurantId), req.user.id);
  }

  @Patch('staff/:staffId')
  updateStaff(
    @Param('restaurantId') restaurantId: string,
    @Param('staffId') staffId: string,
    @Body() updateStaffDto: UpdateStaffDto,
    @Req() req: any,
  ) {
    return this.staffService.updateStaff(Number(restaurantId), staffId, updateStaffDto, req.user.id);
  }

  @Delete('staff/:staffId')
  deleteStaff(
    @Param('restaurantId') restaurantId: string,
    @Param('staffId') staffId: string,
    @Req() req: any,
  ) {
    return this.staffService.deleteStaff(Number(restaurantId), staffId, req.user.id);
  }

  @Patch('staff/:staffId/photo')
  @UseInterceptors(FileInterceptor('photo'))
  uploadPhoto(
    @Param('restaurantId') restaurantId: string,
    @Param('staffId') staffId: string,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    return this.staffService.uploadStaffPhoto(Number(restaurantId), staffId, req.user.id, file);
  }
}