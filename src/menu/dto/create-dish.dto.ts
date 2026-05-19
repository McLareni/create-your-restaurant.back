import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, type TransformFnParams } from 'class-transformer';
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

function toOptionalNumber({ value }: TransformFnParams) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'number') {
    return value;
  }

  const parsedValue = Number(value);
  return Number.isNaN(parsedValue) ? value : parsedValue;
}

function toOptionalBoolean({ value }: TransformFnParams) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return value;
}

function toOptionalStringArray({ value }: TransformFnParams) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return value;
  }

  const trimmedValue = value.trim();

  if (trimmedValue.startsWith('[')) {
    try {
      const parsedValue = JSON.parse(trimmedValue);
      return Array.isArray(parsedValue) ? parsedValue : value;
    } catch {
      return value;
    }
  }

  return trimmedValue
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

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
  @Transform(toOptionalNumber)
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ example: 320 })
  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber()
  @Min(0)
  weight?: number;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @Transform(toOptionalNumber)
  @IsInt()
  @Min(0)
  cookingTime?: number;

  @ApiPropertyOptional({ example: 780 })
  @IsOptional()
  @Transform(toOptionalNumber)
  @IsInt()
  @Min(0)
  calories?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  isVegan?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  isSpicy?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  isLactoseFree?: boolean;

  @ApiPropertyOptional({ enum: DISH_BADGE_TYPES, example: 'NONE' })
  @IsOptional()
  @IsIn(DISH_BADGE_TYPES)
  badge?: DishBadgeType;

  @ApiPropertyOptional({ type: [String], example: ['gluten', 'lactose'] })
  @IsOptional()
  @Transform(toOptionalStringArray)
  @IsArray()
  @IsString({ each: true })
  allergens?: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  isAvailable?: boolean;
}
