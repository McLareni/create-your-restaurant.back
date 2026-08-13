import { IsString, IsNotEmpty, IsBoolean } from 'class-validator';

export class ToggleModuleDto {
  @IsString({ message: 'errors.validation_string' })
  @IsNotEmpty({ message: 'errors.validation_required' })
  moduleKey!: string;

  @IsBoolean({ message: 'errors.validation_boolean' })
  isActive!: boolean;
}
