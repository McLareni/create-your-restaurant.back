import { IsString, IsNumber, IsBoolean, IsOptional, IsArray, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

class DishVariantDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  name!: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsString()
  @IsOptional()
  sku?: string;
}

class IngredientItemDto {
  @IsString()
  name!: string;

  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsString()
  unit!: string;
}

export class CreateDishDto {
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  taxRate?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  weight?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  cookingTime?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  calories?: number;

  @IsBoolean()
  @IsOptional()
  isVegan?: boolean;

  @IsBoolean()
  @IsOptional()
  isSpicy?: boolean;

  @IsBoolean()
  @IsOptional()
  isLactoseFree?: boolean;

  @IsString()
  @IsOptional()
  badge?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allergens?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  modifierIds?: string[];

  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DishVariantDto)
  @IsOptional()
  variants?: DishVariantDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IngredientItemDto)
  @IsOptional()
  ingredients?: IngredientItemDto[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  upsellDishIds?: string[];
}