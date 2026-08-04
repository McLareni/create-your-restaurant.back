import { IsString, IsNotEmpty, Matches, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PinLoginDto {
  @ApiProperty({ example: '123456' })
  @IsString({ message: 'errors.validation_string' })
  @IsNotEmpty({ message: 'errors.validation_required' })
  @Matches(/^\d{4,8}$/, { message: 'errors.invalid_pin_format' })
  pinCode!: string;
}

export class AuthorizeVoidDto {
  @ApiProperty({ example: '123456' })
  @IsString({ message: 'errors.validation_string' })
  @IsNotEmpty({ message: 'errors.validation_required' })
  @Matches(/^\d{4,8}$/, { message: 'errors.invalid_pin_format' })
  pinCode!: string;

  @ApiProperty({ example: 'df5b80f5-c448-4c5b-a651-6ccdc59827d2' })
  @IsUUID(4, { message: 'errors.validation_uuid' })
  @IsNotEmpty({ message: 'errors.validation_required' })
  orderId!: string;
}
