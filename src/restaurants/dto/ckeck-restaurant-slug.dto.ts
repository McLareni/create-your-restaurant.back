import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CheckSlugDto {
  @ApiProperty({ example: 'pizza-house' })
  @MinLength(1, { message: 'errors.validation_min_length' })
  @MaxLength(120, { message: 'errors.validation_max_length' })
  @IsString({ message: 'errors.validation_string' })
  slug!: string;
}
