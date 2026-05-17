import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LogoutDto {
  @ApiProperty({ example: '8c3e1b06-4690-4a0b-9f4a-5c0d6a321f80' })
  @IsString()
  @IsNotEmpty()
  token!: string;
}
