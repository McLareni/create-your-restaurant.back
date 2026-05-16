import { IsEmail, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyLoginCodeDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '123456', description: '6-digit login code' })
  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;
}
