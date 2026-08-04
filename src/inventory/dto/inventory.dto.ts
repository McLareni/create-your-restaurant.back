import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateInventoryItemDto {
  @ApiProperty({ example: 'Помідори' })
  @IsString({ message: 'errors.validation_string' })
  @IsNotEmpty({ message: 'errors.validation_required' })
  @MaxLength(100, { message: 'errors.validation_max_length' })
  name!: string;

  @ApiProperty({ example: 15.5, description: 'Кількість на складі' })
  @IsNumber({}, { message: 'errors.validation_number' })
  @Min(0, { message: 'errors.validation_min_0' })
  stock!: number;

  @ApiProperty({ example: 'кг' })
  @IsString({ message: 'errors.validation_string' })
  @IsNotEmpty({ message: 'errors.validation_required' })
  @MaxLength(20, { message: 'errors.validation_max_length' })
  unit!: string;
}

export class UpdateInventoryItemDto {
  @ApiPropertyOptional({ example: 'Помідори Черрі' })
  @IsOptional()
  @IsString({ message: 'errors.validation_string' })
  @MaxLength(100, { message: 'errors.validation_max_length' })
  name?: string;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsNumber({}, { message: 'errors.validation_number' })
  @Min(0, { message: 'errors.validation_min_0' })
  stock?: number;

  @ApiPropertyOptional({ example: 'кг' })
  @IsOptional()
  @IsString({ message: 'errors.validation_string' })
  @MaxLength(20, { message: 'errors.validation_max_length' })
  unit?: string;
}
