import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Pizzas' })
  @IsOptional()
  @IsString({ message: 'errors.validation_string' })
  @MaxLength(120, { message: 'errors.validation_max_length' })
  name?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt({ message: 'errors.validation_int' })
  @Min(0, { message: 'errors.validation_min_0' })
  sortOrder?: number;
}
