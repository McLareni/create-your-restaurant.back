import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, Min, ValidateNested } from 'class-validator';
import { CreateCategoryDto } from 'src/menu/dto/create-category.dto';

export class CreateMenuDto {
  @ApiProperty({ example: 1 })
  @IsInt({ message: 'errors.validation_int' })
  @Min(1, { message: 'errors.validation_min_1' })
  restaurantId!: number;

  @ApiProperty({ type: [CreateCategoryDto] })
  @IsArray({ message: 'errors.validation_array' })
  @ValidateNested({ each: true, message: 'errors.validation_nested' })
  @Type(() => CreateCategoryDto)
  categories!: CreateCategoryDto[];
}
