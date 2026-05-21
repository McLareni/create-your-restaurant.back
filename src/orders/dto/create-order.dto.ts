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
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateOrderItemModifierDto {
  @ApiProperty({
    example: '8eebf4f4-40aa-4dd0-b7d4-1a58ec4a9e89',
    description: 'Modifier option ID',
  })
  @IsUUID()
  modifierOptionId!: string;

  @ApiPropertyOptional({
    example: 2,
    minimum: 1,
    default: 1,
    description: 'Quantity of the selected modifier option',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}

export class CreateOrderItemDto {
  @ApiProperty({
    example: 'df5b80f5-c448-4c5b-a651-6ccdc59827d2',
    description: 'Dish ID',
  })
  @IsUUID()
  dishId!: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({
    type: [CreateOrderItemModifierDto],
    description: 'Selected modifier options for this dish',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
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
  @IsEnum(OrderType)
  type?: OrderType;

  @ApiPropertyOptional({
    example: '1a2d7d9c-5f73-4bf0-b89a-f12474a584d3',
    description: 'Dining table ID. Required for DINE_IN orders.',
  })
  @IsOptional()
  @IsUUID()
  tableId?: string;

  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}
