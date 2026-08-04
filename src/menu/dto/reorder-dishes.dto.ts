import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator';

export class DishOrderDto {
  @ApiProperty()
  @IsString({ message: 'errors.validation_string' })
  id!: string;

  @ApiProperty()
  @IsInt({ message: 'errors.validation_int' })
  @Min(0, { message: 'errors.validation_min_0' })
  sortOrder!: number;
}

export class ReorderDishesDto {
  @ApiProperty({ type: [DishOrderDto] })
  @IsArray({ message: 'errors.validation_array' })
  @ValidateNested({ each: true, message: 'errors.validation_nested' })
  @Type(() => DishOrderDto)
  items!: DishOrderDto[];
}
