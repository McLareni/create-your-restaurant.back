import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateOrderItemModifierDto {
  @ApiProperty({
    example: '8eebf4f4-40aa-4dd0-b7d4-1a58ec4a9e89',
    description: 'Modifier option ID',
  })
  @IsUUID(4, { message: 'errors.validation_uuid' })
  modifierOptionId!: string;

  @ApiPropertyOptional({
    example: 2,
    minimum: 1,
    maximum: 100,
    default: 1,
    description: 'Quantity of the selected modifier option',
  })
  @IsOptional()
  @IsInt({ message: 'errors.validation_int' })
  @Min(1, { message: 'errors.validation_min_1' })
  @Max(100, { message: 'errors.validation_max_100' })
  quantity?: number;
}

export class CreateOrderItemDto {
  @ApiProperty({
    example: 'df5b80f5-c448-4c5b-a651-6ccdc59827d2',
    description: 'Dish ID',
  })
  @IsUUID(4, { message: 'errors.validation_uuid' })
  dishId!: string;

  @ApiProperty({ example: 2, minimum: 1, maximum: 100 })
  @IsInt({ message: 'errors.validation_int' })
  @Min(1, { message: 'errors.validation_min_1' })
  @Max(100, { message: 'errors.validation_max_100' })
  quantity!: number;

  @ApiPropertyOptional({
    type: [CreateOrderItemModifierDto],
    description: 'Selected modifier options for this dish',
  })
  @IsOptional()
  @IsArray({ message: 'errors.validation_array' })
  @ValidateNested({ each: true, message: 'errors.validation_nested' })
  @Type(() => CreateOrderItemModifierDto)
  modifiers?: CreateOrderItemModifierDto[];
}

export class CreateOrderDto {
  @ApiPropertyOptional({
    enum: OrderType,
    example: OrderType.DINE_IN,
    default: OrderType.DINE_IN,
  })
  @IsOptional()
  @IsEnum(OrderType, { message: 'errors.validation_enum' })
  type?: OrderType;

  @ApiPropertyOptional({
    example: '1a2d7d9c-5f73-4bf0-b89a-f12474a584d3',
    description: 'Dining table ID. Required for DINE_IN orders.',
  })
  @IsOptional()
  @IsUUID(4, { message: 'errors.validation_uuid' })
  tableId?: string;

  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray({ message: 'errors.validation_array' })
  @ArrayMinSize(1, { message: 'errors.validation_array_min_1' })
  @ValidateNested({ each: true, message: 'errors.validation_nested' })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}
