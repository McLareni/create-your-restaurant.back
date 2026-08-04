import {
  IsString,
  IsEnum,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  IsUUID,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ComboPriceType } from '@prisma/client';

class ComboDishDto {
  @IsUUID(4, { message: 'errors.validation_uuid' })
  id!: string;
}

export class CreateComboDto {
  @IsString({ message: 'errors.validation_string' })
  @IsNotEmpty({ message: 'errors.validation_required' })
  @MaxLength(120, { message: 'errors.validation_max_length' })
  name!: string;

  @IsEnum(ComboPriceType, { message: 'errors.validation_enum' })
  priceType!: ComboPriceType;

  @IsNumber({}, { message: 'errors.validation_number' })
  @Min(0, { message: 'errors.validation_min_0' })
  priceValue!: number;

  @IsArray({ message: 'errors.validation_array' })
  @ValidateNested({ each: true, message: 'errors.validation_nested' })
  @Type(() => ComboDishDto)
  dishes!: ComboDishDto[];
}
