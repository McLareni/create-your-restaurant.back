import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
  IsUUID,
} from 'class-validator';

export class CreateModifierOptionDto {
  @ApiPropertyOptional({ example: '8eebf4f4-40aa-4dd0-b7d4-1a58ec4a9e89' })
  @IsOptional()
  @IsUUID(4, { message: 'errors.validation_uuid' })
  id?: string;

  @ApiProperty({ example: 'Екстра сир' })
  @IsString({ message: 'errors.validation_string' })
  @IsNotEmpty({ message: 'errors.validation_required' })
  @MaxLength(120, { message: 'errors.validation_max_length' })
  name!: string;

  @ApiPropertyOptional({ example: 40 })
  @IsOptional()
  @IsNumber({}, { message: 'errors.validation_number' })
  @Min(0, { message: 'errors.validation_min_0' })
  price?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean({ message: 'errors.validation_boolean' })
  isAvailable?: boolean;
}

export class CreateModifierGroupDto {
  @ApiProperty({ example: 'Додатки до піци' })
  @IsString({ message: 'errors.validation_string' })
  @IsNotEmpty({ message: 'errors.validation_required' })
  @MaxLength(120, { message: 'errors.validation_max_length' })
  name!: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean({ message: 'errors.validation_boolean' })
  isRequired?: boolean;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt({ message: 'errors.validation_int' })
  @Min(0, { message: 'errors.validation_min_0' })
  minSelections?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt({ message: 'errors.validation_int' })
  @Min(1, { message: 'errors.validation_min_1' })
  maxSelections?: number;

  @ApiProperty({ type: [CreateModifierOptionDto] })
  @ValidateNested({ each: true, message: 'errors.validation_nested' })
  @Type(() => CreateModifierOptionDto)
  options!: CreateModifierOptionDto[];
}
