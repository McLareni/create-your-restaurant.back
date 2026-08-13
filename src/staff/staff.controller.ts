import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
  ParseIntPipe,
  ParseFilePipe,
  MaxFileSizeValidator,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { CreateStaffDto } from 'src/staff/dto/create-staff.dto';
import { UpdateStaffDto } from 'src/staff/dto/update-staff.dto';
import { CreateStaffRoleDto } from 'src/staff/dto/create-staff-role.dto';
import { UpdateStaffRolePermissionsDto } from 'src/staff/dto/update-staff-role-permissions.dto';
import { StaffService } from 'src/staff/staff.service';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { SessionAuthGuard } from 'src/guards/session-auth.guard';
import { RequirePermission } from 'src/guards/permission.decorator';
import { FileSignatureValidator } from 'src/common/validators/file-signature.validator';
import { CurrentUser } from 'src/users/decorators/current-user.decorator';
import type { User } from '@prisma/client';
import { PERMISSIONS } from 'src/common/constants/permissions.constants';
import type { UploadedStaffImage } from 'src/cloudinary/cloudinary.service';

@Controller('restaurants/:restaurantId')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get('staff/permissions')
  @RequirePermission(PERMISSIONS.STAFF_READ)
  getAvailablePermissions(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @CurrentUser() user: User,
  ) {
    return this.staffService.getAvailablePermissions(restaurantId, user.id);
  }

  @Post('staff/roles')
  @RequirePermission(PERMISSIONS.STAFF_ROLES)
  createRole(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Body() createStaffRoleDto: CreateStaffRoleDto,
    @CurrentUser() user: User,
  ) {
    return this.staffService.createStaffRole(
      restaurantId,
      createStaffRoleDto,
      user.id,
    );
  }

  @Get('staff/roles')
  @RequirePermission(PERMISSIONS.STAFF_READ)
  getRoles(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @CurrentUser() user: User,
  ) {
    return this.staffService.getStaffRoles(restaurantId, user.id);
  }

  @Patch('staff/roles/:roleId')
  @RequirePermission(PERMISSIONS.STAFF_ROLES)
  updateRole(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('roleId') roleId: string,
    @Body() body: UpdateStaffRolePermissionsDto,
    @CurrentUser() user: User,
  ) {
    return this.staffService.updateStaffRole(
      restaurantId,
      roleId,
      body.permissions,
      user.id,
    );
  }

  @Delete('staff/roles/:roleId')
  @RequirePermission(PERMISSIONS.STAFF_ROLES)
  deleteRole(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('roleId') roleId: string,
    @CurrentUser() user: User,
  ) {
    return this.staffService.deleteStaffRole(restaurantId, roleId, user.id);
  }

  @Post('staff')
  @RequirePermission(PERMISSIONS.STAFF_CREATE)
  createStaff(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Body() createStaffDto: CreateStaffDto,
    @CurrentUser() user: User,
  ) {
    return this.staffService.createStaff(restaurantId, createStaffDto, user.id);
  }

  @Get('staff')
  @RequirePermission(PERMISSIONS.STAFF_READ)
  getStaffList(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @CurrentUser() user: User,
  ) {
    return this.staffService.getStaffList(restaurantId, user.id);
  }

  @Patch('staff/:staffId')
  @RequirePermission(PERMISSIONS.STAFF_UPDATE)
  updateStaff(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('staffId') staffId: string,
    @Body() updateStaffDto: UpdateStaffDto,
    @CurrentUser() user: User,
  ) {
    return this.staffService.updateStaff(
      restaurantId,
      staffId,
      updateStaffDto,
      user.id,
    );
  }

  @Delete('staff/:staffId')
  @RequirePermission(PERMISSIONS.STAFF_DELETE)
  deleteStaff(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('staffId') staffId: string,
    @CurrentUser() user: User,
  ) {
    return this.staffService.deleteStaff(restaurantId, staffId, user.id);
  }

  @Patch('staff/:staffId/photo')
  @RequirePermission(PERMISSIONS.STAFF_UPDATE)
  @UseInterceptors(FileInterceptor('photo'))
  uploadPhoto(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('staffId') staffId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 5 * 1024 * 1024,
            message: 'errors.file_too_large',
          }),
          new FileSignatureValidator(),
        ],
      }),
    )
    file: UploadedStaffImage,
    @CurrentUser() user: User,
  ) {
    return this.staffService.uploadStaffPhoto(
      restaurantId,
      staffId,
      user.id,
      file,
    );
  }
}
