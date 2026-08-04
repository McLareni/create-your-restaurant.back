import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { CreateDishDto } from 'src/menu/dto/create-dish.dto';

export class UpdateDishDto extends PartialType(CreateDishDto) {
  @ApiPropertyOptional({ example: 'cat_uuid_string' })
  @IsOptional()
  @IsString({ message: 'errors.validation_string' })
  categoryId?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt({ message: 'errors.validation_int' })
  @Min(0, { message: 'errors.validation_min_0' })
  sortOrder?: number;
}
