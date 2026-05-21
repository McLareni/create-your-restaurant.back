import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency, Language, RestaurantType } from '@prisma/client';
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

  @ApiProperty({ enum: RestaurantType, example: RestaurantType.CAFE })
  @IsEnum(RestaurantType)
  type!: RestaurantType;

  @ApiProperty({ enum: Currency, example: Currency.USD })
  @IsEnum(Currency)
  currency!: Currency;

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

  @ApiProperty({ enum: Language, example: Language.UA })
  @IsEnum(Language)
  language!: Language;
}