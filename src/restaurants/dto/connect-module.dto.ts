import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class ConnectModuleDto {
  @IsString({ message: 'errors.validation_string' })
  @IsNotEmpty({ message: 'errors.validation_required' })
  moduleKey!: string;

  @IsString({ message: 'errors.validation_string' })
  @IsOptional()
  activationCode?: string;
}
