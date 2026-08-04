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
  ParseFilePipe,
  MaxFileSizeValidator,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsArray, IsString } from 'class-validator';
import { CreateStaffDto } from 'src/staff/dto/create-staff.dto';
import { UpdateStaffDto } from 'src/staff/dto/update-staff.dto';
import { CreateStaffRoleDto } from 'src/staff/dto/create-staff-role.dto';
import { StaffService } from 'src/staff/staff.service';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { RequirePermission } from 'src/guards/permission.decorator';
import { FileSignatureValidator } from 'src/common/validators/file-signature.validator';
import type { AuthenticatedRequest } from 'src/restaurants/middleware/session-auth.middleware';
import { PERMISSIONS } from 'src/common/constants/permissions.constants';

type UploadedStaffImage = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

export class UpdateStaffRolePermissionsDto {
  @IsArray({ message: 'errors.validation_array' })
  @IsString({ each: true, message: 'errors.validation_string' })
  permissions!: string[];
}

@Controller('restaurants/:restaurantId')
@UseGuards(PermissionsGuard)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get('staff/permissions')
  @RequirePermission(PERMISSIONS.STAFF_READ)
  getAvailablePermissions(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.staffService.getAvailablePermissions(restaurantId, req.user.id);
  }

  @Post('staff/roles')
  @RequirePermission(PERMISSIONS.STAFF_ROLES)
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
  @RequirePermission(PERMISSIONS.STAFF_READ)
  getRoles(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.staffService.getStaffRoles(restaurantId, req.user.id);
  }

  @Patch('staff/roles/:roleId')
  @RequirePermission(PERMISSIONS.STAFF_ROLES)
  updateRole(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('roleId') roleId: string,
    @Body() body: UpdateStaffRolePermissionsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.staffService.updateStaffRole(
      restaurantId,
      roleId,
      body.permissions,
      req.user.id,
    );
  }

  @Delete('staff/roles/:roleId')
  @RequirePermission(PERMISSIONS.STAFF_ROLES)
  deleteRole(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('roleId') roleId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.staffService.deleteStaffRole(restaurantId, roleId, req.user.id);
  }

  @Post('staff')
  @RequirePermission(PERMISSIONS.STAFF_CREATE)
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
  @RequirePermission(PERMISSIONS.STAFF_READ)
  getStaffList(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.staffService.getStaffList(restaurantId, req.user.id);
  }

  @Patch('staff/:staffId')
  @RequirePermission(PERMISSIONS.STAFF_UPDATE)
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
  @RequirePermission(PERMISSIONS.STAFF_DELETE)
  deleteStaff(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('staffId') staffId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.staffService.deleteStaff(restaurantId, staffId, req.user.id);
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
