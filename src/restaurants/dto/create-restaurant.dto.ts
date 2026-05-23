import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EnumCurrency, EnumLanguage, EnumTypeRestaurant } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRestaurantDto {
  @ApiProperty({ example: 'Pizza House' })
  @IsString()
  @MaxLength(120)
  title!: string;

  @ApiProperty({ example: 'pizza-house' })
  @IsString()
  @MaxLength(120)
  slug!: string;

  @ApiProperty({ enum: EnumTypeRestaurant, example: EnumTypeRestaurant.CAFE })
  @IsEnum(EnumTypeRestaurant)
  type!: EnumTypeRestaurant;

  @ApiProperty({ enum: EnumCurrency, example: EnumCurrency.USD })
  @IsEnum(EnumCurrency)
  currency!: EnumCurrency;

  @ApiPropertyOptional({ example: '+380991112233' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'Kyiv' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @ApiProperty({ enum: EnumLanguage, example: EnumLanguage.UA })
  @IsEnum(EnumLanguage)
  language!: EnumLanguage;
}
