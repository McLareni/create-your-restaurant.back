import {
  IsNotEmpty,
  IsString,
  IsBoolean,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class ConnectPosDto {
  @IsString({ message: 'errors.validation_string' })
  @IsNotEmpty({ message: 'errors.validation_required' })
  @MinLength(16, { message: 'errors.token_too_short' })
  @MaxLength(128, { message: 'errors.token_too_long' })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'errors.invalid_token_format',
  })
  apiKey!: string;
}

export class UpdatePosSettingsDto {
  @IsBoolean({ message: 'errors.validation_boolean' })
  @IsOptional()
  importMenu?: boolean;

  @IsBoolean({ message: 'errors.validation_boolean' })
  @IsOptional()
  syncStops?: boolean;
}
