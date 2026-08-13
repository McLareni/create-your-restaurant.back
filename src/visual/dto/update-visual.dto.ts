import { IsString, IsOptional } from 'class-validator';

export class UpdateVisualDto {
  @IsString({ message: 'errors.validation_string' })
  @IsOptional()
  theme?: string;

  @IsString({ message: 'errors.validation_string' })
  @IsOptional()
  primaryColor?: string;

  @IsString({ message: 'errors.validation_string' })
  @IsOptional()
  backgroundColor?: string;

  @IsString({ message: 'errors.validation_string' })
  @IsOptional()
  borderRadius?: string;

  @IsString({ message: 'errors.validation_string' })
  @IsOptional()
  fontFamily?: string;

  @IsString({ message: 'errors.validation_string' })
  @IsOptional()
  buttonStyle?: string;

  @IsString({ message: 'errors.validation_string' })
  @IsOptional()
  shadowIntensity?: string;
}
