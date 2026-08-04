import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestLoginCodeDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'errors.validation_email' })
  email!: string;
}
