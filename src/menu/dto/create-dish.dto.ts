import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
  IsUUID,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class IngredientItemDto {
  @IsString({ message: 'errors.validation_string' })
  @IsNotEmpty({ message: 'errors.validation_required' })
  name!: string;

  @IsUUID(4, { message: 'errors.validation_uuid' })
  @IsOptional()
  inventoryItemId?: string;

  @IsNumber({}, { message: 'errors.validation_number' })
  @Min(0, { message: 'errors.validation_min_0' })
  quantity!: number;

  @IsString({ message: 'errors.validation_string' })
  @IsNotEmpty({ message: 'errors.validation_required' })
  unit!: string;
}

export class CreateDishDto {
  @IsString({ message: 'errors.validation_string' })
  @IsNotEmpty({ message: 'errors.validation_required' })
  name!: string;

  @IsString({ message: 'errors.validation_string' })
  @IsOptional()
  description?: string;

  @IsNumber({}, { message: 'errors.validation_number' })
  @Min(0, { message: 'errors.validation_min_0' })
  price!: number;

  @IsNumber({}, { message: 'errors.validation_number' })
  @IsOptional()
  @Min(0, { message: 'errors.validation_min_0' })
  weight?: number;

  @IsNumber({}, { message: 'errors.validation_number' })
  @IsOptional()
  @Min(0, { message: 'errors.validation_min_0' })
  cookingTime?: number;

  @IsNumber({}, { message: 'errors.validation_number' })
  @IsOptional()
  @Min(0, { message: 'errors.validation_min_0' })
  calories?: number;

  @IsBoolean({ message: 'errors.validation_boolean' })
  @IsOptional()
  isVegan?: boolean;

  @IsBoolean({ message: 'errors.validation_boolean' })
  @IsOptional()
  isSpicy?: boolean;

  @IsBoolean({ message: 'errors.validation_boolean' })
  @IsOptional()
  isLactoseFree?: boolean;

  @IsString({ message: 'errors.validation_string' })
  @IsOptional()
  badge?: string;

  @IsArray({ message: 'errors.validation_array' })
  @IsString({ each: true, message: 'errors.validation_string' })
  @IsOptional()
  allergens?: string[];

  @IsArray({ message: 'errors.validation_array' })
  @IsString({ each: true, message: 'errors.validation_string' })
  @IsOptional()
  tags?: string[];

  @IsArray({ message: 'errors.validation_array' })
  @IsString({ each: true, message: 'errors.validation_string' })
  @IsOptional()
  modifierIds?: string[];

  @IsBoolean({ message: 'errors.validation_boolean' })
  @IsOptional()
  isAvailable?: boolean;

  @IsArray({ message: 'errors.validation_array' })
  @ValidateNested({ each: true, message: 'errors.validation_nested' })
  @Type(() => IngredientItemDto)
  @IsOptional()
  ingredients?: IngredientItemDto[];
}
