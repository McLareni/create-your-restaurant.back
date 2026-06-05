import { IsNotEmpty, IsString, IsBoolean, IsOptional } from 'class-validator';

export class ConnectPosDto {
  @IsString()
  @IsNotEmpty()
  apiKey!: string;
}

export class UpdatePosSettingsDto {
  @IsBoolean()
  @IsOptional()
  importMenu?: boolean;

  @IsBoolean()
  @IsOptional()
  syncStops?: boolean;
}
