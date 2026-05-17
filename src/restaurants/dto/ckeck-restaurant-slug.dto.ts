import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CheckSlugDto {
  @ApiProperty({ example: 'pizza-house' })
  @MinLength(1)
  @MaxLength(120)
  @IsString()
  slug!: string;
}
