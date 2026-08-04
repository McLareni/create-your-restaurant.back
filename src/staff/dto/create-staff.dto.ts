import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  Matches,
} from 'class-validator';

export class CreateStaffDto {
  @ApiProperty({ example: 'John' })
  @IsString({ message: 'errors.validation_string' })
  @IsNotEmpty({ message: 'errors.validation_required' })
  @MaxLength(120, { message: 'errors.validation_max_length' })
  @Matches(/^[a-zA-Zа-яА-ЯіІїЇєЄґҐ\s'’-]+$/, {
    message: 'errors.invalid_first_name_format',
  })
  firstName!: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString({ message: 'errors.validation_string' })
  @MaxLength(120, { message: 'errors.validation_max_length' })
  @Matches(/^[a-zA-Zа-яА-ЯіІїЇєЄґҐ\s'’-]+$/, {
    message: 'errors.invalid_last_name_format',
  })
  lastName?: string;

  @ApiProperty({ example: 'staff@example.com' })
  @IsEmail({}, { message: 'errors.validation_email' })
  @Matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, {
    message: 'errors.email_latin_only',
  })
  email!: string;

  @ApiPropertyOptional({ example: '+380991112233' })
  @IsOptional()
  @IsString({ message: 'errors.validation_string' })
  @MaxLength(30, { message: 'errors.validation_max_length' })
  @Matches(/^\+?[0-9\s()-]{7,20}$/, {
    message: 'errors.invalid_phone_format',
  })
  phone?: string;

  @ApiProperty({ example: 'Офіціант' })
  @IsString({ message: 'errors.validation_string' })
  @IsNotEmpty({ message: 'errors.validation_required' })
  @MaxLength(100, { message: 'errors.validation_max_length' })
  @Matches(/^[a-zA-Zа-яА-ЯіІїЇєЄґҐ\s'’-]+$/, {
    message: 'errors.invalid_role_format',
  })
  role!: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean({ message: 'errors.validation_boolean' })
  isActive?: boolean;

  @IsOptional()
  @IsString({ message: 'errors.validation_string' })
  @MaxLength(255, { message: 'errors.validation_max_length' })
  photo?: string;

  @ApiPropertyOptional({ example: '123456' })
  @IsOptional()
  @IsString({ message: 'errors.validation_string' })
  @MinLength(4, { message: 'errors.validation_min_length' })
  @MaxLength(100, { message: 'errors.validation_max_length' })
  @Matches(/^[^\u0400-\u04FF]+$/, {
    message: 'errors.password_no_cyrillic',
  })
  password?: string;

  @ApiPropertyOptional({ example: 50.0 })
  @IsOptional()
  @IsNumber({}, { message: 'errors.validation_number' })
  @Min(0, { message: 'errors.validation_min_0' })
  hourlyRate?: number;

  @ApiPropertyOptional({ example: 3.5 })
  @IsOptional()
  @IsNumber({}, { message: 'errors.validation_number' })
  @Min(0, { message: 'errors.validation_min_0' })
  @Max(100, { message: 'errors.validation_max_100' })
  salesPercentage?: number;
}
