import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TableStatus } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTableDto {
  @ApiProperty({ example: 12, minimum: 1 })
  @IsInt({ message: 'errors.validation_int' })
  @Min(1, { message: 'errors.validation_min_1' })
  number!: number;

  @ApiPropertyOptional({
    enum: TableStatus,
    example: TableStatus.ACTIVE,
    default: TableStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(TableStatus, { message: 'errors.validation_enum' })
  status?: TableStatus;

  @ApiProperty({
    example: 'TERRACE',
    description: 'Table type, e.g. BAR, TERRACE, HALL',
  })
  @IsString({ message: 'errors.validation_string' })
  @IsNotEmpty({ message: 'errors.validation_required' })
  @MaxLength(60, { message: 'errors.validation_max_length' })
  type!: string;

  @ApiPropertyOptional({ example: 'TERRACE' })
  @IsOptional()
  @IsString({ message: 'errors.validation_string' })
  zone?: string;
}
