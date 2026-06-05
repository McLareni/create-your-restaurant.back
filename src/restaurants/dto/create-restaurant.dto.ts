import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EnumCurrency, EnumLanguage, EnumTypeRestaurant } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  IsArray,
} from 'class-validator';

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

  // НОВІ ПОЛЯ ДЛЯ ВАЛІДАЦІЇ:
  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  building?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  workDays?: string[];

  @IsOptional()
  @IsString()
  workHoursStart?: string;

  @IsOptional()
  @IsString()
  workHoursEnd?: string;

  @IsOptional()
  @IsString()
  instagram?: string;

  @IsOptional()
  @IsString()
  facebook?: string;

  @IsOptional()
  @IsString()
  telegram?: string;

  @IsOptional()
  @IsString()
  tiktok?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ enum: EnumLanguage, example: EnumLanguage.UA })
  @IsEnum(EnumLanguage)
  language!: EnumLanguage;
}
