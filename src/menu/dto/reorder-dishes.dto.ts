import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator';

export class DishOrderDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  sortOrder!: number;
}

export class ReorderDishesDto {
  @ApiProperty({ type: [DishOrderDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DishOrderDto)
  items!: DishOrderDto[];
}