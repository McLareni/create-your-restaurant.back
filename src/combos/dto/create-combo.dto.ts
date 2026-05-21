import { IsString, IsEnum, IsNumber, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ComboPriceType } from '@prisma/client';

class ComboDishDto {
  @IsString()
  id!: string;

  @IsString()
  name!: string;

  @IsNumber()
  @Min(0)
  price!: number;
}

export class CreateComboDto {
  @IsString()
  name!: string;

  @IsEnum(ComboPriceType)
  priceType!: ComboPriceType;

  @IsNumber()
  @Min(0)
  priceValue!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComboDishDto)
  dishes!: ComboDishDto[];
}