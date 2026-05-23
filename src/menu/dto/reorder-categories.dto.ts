import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator';

export class CategoryOrderDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  sortOrder!: number;
}

export class ReorderCategoriesDto {
  @ApiProperty({ type: [CategoryOrderDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryOrderDto)
  items!: CategoryOrderDto[];
}
