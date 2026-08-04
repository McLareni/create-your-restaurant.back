import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { EnumRole } from '@prisma/client';

export class CreateUserDto {
  @IsEmail({}, { message: 'errors.validation_email' })
  email!: string;

  @IsOptional()
  @IsString({ message: 'errors.validation_string' })
  firstName?: string;

  @IsOptional()
  @IsString({ message: 'errors.validation_string' })
  lastName?: string;

  @IsOptional()
  @IsString({ message: 'errors.validation_string' })
  photo?: string;

  @IsEnum(EnumRole, { message: 'errors.validation_enum' })
  role!: EnumRole;
}
