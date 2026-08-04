import { IsEmail, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyLoginCodeDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'errors.validation_email' })
  email!: string;

  @ApiProperty({ example: '123456', description: '6-digit login code' })
  @IsString({ message: 'errors.validation_string' })
  @Matches(/^\d{6}$/, { message: 'errors.invalid_code_format' })
  code!: string;
}
