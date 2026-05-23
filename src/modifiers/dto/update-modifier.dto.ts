import { PartialType } from '@nestjs/swagger';
import { CreateModifierGroupDto } from './create-modifier.dto';

export class UpdateModifierGroupDto extends PartialType(
  CreateModifierGroupDto,
) {}
