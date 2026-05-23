import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AttachModifierDto {
  @ApiProperty({ example: 'uuid-modifier-group-id' })
  @IsString()
  @IsNotEmpty()
  modifierGroupId!: string;
}
