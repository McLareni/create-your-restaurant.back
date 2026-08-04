import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  MaxLength,
  Matches,
  IsArray,
  IsOptional,
} from 'class-validator';

export class CreateStaffRoleDto {
  @ApiProperty({ example: 'Офіціант' })
  @IsString({ message: 'errors.validation_string' })
  @IsNotEmpty({ message: 'errors.validation_required' })
  @MaxLength(100, { message: 'errors.validation_max_length' })
  @Matches(/^[a-zA-Zа-яА-ЯіІїЇєЄґҐ\s'’-]+$/, {
    message: 'errors.invalid_role_name_format',
  })
  name!: string;

  @ApiProperty({ example: ['orders', 'menu'] })
  @IsOptional()
  @IsArray({ message: 'errors.validation_array' })
  @IsString({ each: true, message: 'errors.validation_string' })
  permissions?: string[];
}
