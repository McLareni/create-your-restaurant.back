import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class AttachModifierDto {
  @ApiProperty({ example: 'uuid-modifier-group-id' })
  @IsString({ message: 'errors.validation_string' })
  @IsNotEmpty({ message: 'errors.validation_required' })
  @IsUUID(4, { message: 'errors.validation_uuid' })
  modifierGroupId!: string;
}
