import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
} from 'class-validator';

const DISH_BADGE_TYPES = [
  'NONE',
  'NEW',
  'HIT',
  'CHEF_CHOICE',
  'TOP_RATED',
] as const;

type DishBadgeType = (typeof DISH_BADGE_TYPES)[number];

export class CreateDishDto {
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
