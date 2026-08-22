import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export enum WaiterCallType {
  WAITER = 'WAITER',
  BILL = 'BILL',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
}

export class TriggerCallDto {
  @ApiProperty({
    description: 'The ID of the table',
    example: '1a2d7d9c-5f73-4bf0-b89a-f12474a584d3',
  })
  @IsUUID('4', { message: 'errors.validation_uuid' })
  tableId: string;

  @ApiProperty({ description: 'The type of call', enum: WaiterCallType })
  @IsEnum(WaiterCallType, { message: 'errors.validation_enum' })
  type: WaiterCallType;

  @ApiProperty({
    description: 'Requested payment method for a bill call',
    enum: PaymentMethod,
    required: false,
  })
  @IsEnum(PaymentMethod, { message: 'errors.validation_enum' })
  @IsOptional()
  paymentMethod?: PaymentMethod;
}
