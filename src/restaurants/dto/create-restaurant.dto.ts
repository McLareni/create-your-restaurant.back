import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EnumCurrency, EnumLanguage, EnumTypeRestaurant } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  IsArray,
  MinLength,
  Matches,
} from 'class-validator';

export class CreateRestaurantDto {
  @ApiProperty({ example: 'Pizza House' })
  @IsString({ message: 'errors.validation_string' })
  @MinLength(3, { message: 'errors.validation_min_length' })
  @MaxLength(120, { message: 'errors.validation_max_length' })
  title!: string;

  @ApiProperty({ example: 'pizza-house' })
  @IsString({ message: 'errors.validation_string' })
  @MinLength(2, { message: 'errors.validation_min_length' })
  @MaxLength(120, { message: 'errors.validation_max_length' })
  @Matches(/^[a-z0-9-]+$/, { message: 'errors.validation_matches' })
  slug!: string;

  @ApiProperty({ enum: EnumTypeRestaurant, example: EnumTypeRestaurant.CAFE })
  @IsEnum(EnumTypeRestaurant, { message: 'errors.validation_enum' })
  type!: EnumTypeRestaurant;

  @ApiProperty({ enum: EnumCurrency, example: EnumCurrency.USD })
  @IsEnum(EnumCurrency, { message: 'errors.validation_enum' })
  currency!: EnumCurrency;

  @ApiPropertyOptional({ example: '+380991112233' })
  @IsOptional()
  @IsString({ message: 'errors.validation_string' })
  @MaxLength(30, { message: 'errors.validation_max_length' })
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'Kyiv' })
  @IsOptional()
  @IsString({ message: 'errors.validation_string' })
  @MaxLength(120, { message: 'errors.validation_max_length' })
  city?: string;

  @ApiPropertyOptional({ example: 'Main St.' })
  @IsOptional()
  @IsString({ message: 'errors.validation_string' })
  @MaxLength(120, { message: 'errors.validation_max_length' })
  street?: string;

  @ApiPropertyOptional({ example: '42A' })
  @IsOptional()
  @IsString({ message: 'errors.validation_string' })
  @MaxLength(20, { message: 'errors.validation_max_length' })
  building?: string;

  @ApiPropertyOptional({ example: ['mon', 'tue'] })
  @IsOptional()
  @IsArray({ message: 'errors.validation_array' })
  @IsString({ each: true, message: 'errors.validation_string' })
  workDays?: string[];

  @ApiPropertyOptional({ example: '10:00' })
  @IsOptional()
  @IsString({ message: 'errors.validation_string' })
  @MaxLength(5, { message: 'errors.validation_max_length' })
  workHoursStart?: string;

  @ApiPropertyOptional({ example: '22:00' })
  @IsOptional()
  @IsString({ message: 'errors.validation_string' })
  @MaxLength(5, { message: 'errors.validation_max_length' })
  workHoursEnd?: string;

  @ApiPropertyOptional({ example: 'instagram_handle' })
  @IsOptional()
  @IsString({ message: 'errors.validation_string' })
  @MaxLength(100, { message: 'errors.validation_max_length' })
  instagram?: string;

  @ApiPropertyOptional({ example: 'facebook_page' })
  @IsOptional()
  @IsString({ message: 'errors.validation_string' })
  @MaxLength(100, { message: 'errors.validation_max_length' })
  facebook?: string;

  @ApiPropertyOptional({ example: 'telegram_channel' })
  @IsOptional()
  @IsString({ message: 'errors.validation_string' })
  @MaxLength(100, { message: 'errors.validation_max_length' })
  telegram?: string;

  @ApiPropertyOptional({ example: 'tiktok_user' })
  @IsOptional()
  @IsString({ message: 'errors.validation_string' })
  @MaxLength(100, { message: 'errors.validation_max_length' })
  tiktok?: string;

  @ApiPropertyOptional({ example: 'https://example.com/image.jpg' })
  @IsOptional()
  @IsString({ message: 'errors.validation_string' })
  @MaxLength(255, { message: 'errors.validation_max_length' })
  imageUrl?: string;

  @ApiProperty({ enum: EnumLanguage, example: EnumLanguage.UA })
  @IsEnum(EnumLanguage, { message: 'errors.validation_enum' })
  language!: EnumLanguage;
}
