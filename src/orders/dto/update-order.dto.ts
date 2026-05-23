import { ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class UpdateOrderDto {
  @ApiPropertyOptional({ enum: OrderStatus, example: OrderStatus.IN_PROGRESS })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
  @ApiPropertyOptional({
    example: '1a2d7d9c-5f73-4bf0-b89a-f12474a584d3',
    description: 'Dining table ID',
  })
  @IsOptional()
  @IsUUID()
  tableId?: string;
}
