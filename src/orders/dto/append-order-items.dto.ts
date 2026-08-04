import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { CreateOrderItemDto } from 'src/orders/dto/create-order.dto';

export class AppendOrderItemsDto {
  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray({ message: 'errors.validation_array' })
  @ArrayMinSize(1, { message: 'errors.validation_array_min_1' })
  @ValidateNested({ each: true, message: 'errors.validation_nested' })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}
