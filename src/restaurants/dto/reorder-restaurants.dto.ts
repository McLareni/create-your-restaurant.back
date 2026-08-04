import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt } from 'class-validator';

export class ReorderRestaurantsDto {
  @ApiProperty({ type: [Number], example: [3, 1, 2] })
  @IsArray({ message: 'errors.validation_array' })
  @IsInt({ each: true, message: 'errors.validation_int' })
  ids!: number[];
}
