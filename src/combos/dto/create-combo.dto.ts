import { IsString, IsIn, IsNumber, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

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

  @IsString()
  @IsIn(['FIXED', 'DISCOUNT'])
  priceType!: string;

  @IsNumber()
  @Min(0)
  priceValue!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComboDishDto)
  dishes!: ComboDishDto[];
}