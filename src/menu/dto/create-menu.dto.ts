import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const DISH_BADGE_TYPES = [
  'NONE',
  'NEW',
  'HIT',
  'CHEF_CHOICE',
  'TOP_RATED',
] as const;

type DishBadgeType = (typeof DISH_BADGE_TYPES)[number];

class CreateDishDto {
  @ApiProperty({ example: 'Margherita' })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ example: 'Tomato sauce, mozzarella, basil' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: 12.5 })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ example: 320 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsInt()
  @Min(0)
  cookingTime?: number;

  @ApiPropertyOptional({ example: 780 })
  @IsOptional()
  @IsInt()
  @Min(0)
  calories?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isVegan?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isSpicy?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isLactoseFree?: boolean;

  @ApiPropertyOptional({ enum: DISH_BADGE_TYPES, example: 'NONE' })
  @IsOptional()
  @IsIn(DISH_BADGE_TYPES)
  badge?: DishBadgeType;

  @ApiPropertyOptional({ type: [String], example: ['gluten', 'lactose'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergens?: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}

class CreateCategoryDto {
  @ApiProperty({ example: 'Pizzas' })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiProperty({ type: [CreateDishDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDishDto)
  dishes!: CreateDishDto[];
}

export class CreateMenuDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  restaurantId!: number;

  @ApiProperty({ type: [CreateCategoryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCategoryDto)
  categories!: CreateCategoryDto[];
}
