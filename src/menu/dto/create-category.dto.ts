import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateDishDto } from 'src/menu/dto/create-dish.dto';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Pizzas' })
  @IsString({ message: 'errors.validation_string' })
  @MaxLength(120, { message: 'errors.validation_max_length' })
  name!: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt({ message: 'errors.validation_int' })
  @Min(0, { message: 'errors.validation_min_0' })
  sortOrder?: number;

  @ApiPropertyOptional({ type: () => [CreateDishDto] })
  @IsOptional()
  @IsArray({ message: 'errors.validation_array' })
  @ValidateNested({ each: true, message: 'errors.validation_nested' })
  @Type(() => CreateDishDto)
  dishes?: CreateDishDto[];
}
