import { IsArray, IsString } from 'class-validator';

export class UpdateStaffRolePermissionsDto {
  @IsArray({ message: 'errors.validation_array' })
  @IsString({ each: true, message: 'errors.validation_string' })
  permissions!: string[];
}
