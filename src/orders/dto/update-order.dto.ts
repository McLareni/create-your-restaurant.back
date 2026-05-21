import { ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateOrderDto {
  @ApiPropertyOptional({ enum: OrderStatus, example: OrderStatus.COOKING })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ example: 'uuid-table-id' })
  @IsOptional()
  @IsString()
  tableId?: string;
}