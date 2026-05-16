import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { EnumRole } from '../../../generated/prisma/enums';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  photo?: string;

  @IsEnum(EnumRole)
  role!: EnumRole;
}
