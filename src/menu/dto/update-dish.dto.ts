import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { CreateDishDto } from './create-dish.dto';

export class UpdateDishDto extends PartialType(CreateDishDto) {
  @ApiPropertyOptional({ example: 'cat_uuid_string' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}