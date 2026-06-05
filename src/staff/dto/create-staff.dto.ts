import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  Matches,
} from 'class-validator';

export class CreateStaffDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Matches(/^[a-zA-Zа-яА-ЯіІїЇєЄґҐ\s'’-]+$/, {
    message:
      'First name can only contain letters, spaces, hyphens, and apostrophes',
  })
  firstName!: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Matches(/^[a-zA-Zа-яА-ЯіІїЇєЄґҐ\s'’-]+$/, {
    message:
      'Last name can only contain letters, spaces, hyphens, and apostrophes',
  })
  lastName?: string;

  @ApiProperty({ example: 'staff@example.com' })
  @IsEmail()
  @Matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, {
    message: 'Email must contain only Latin characters',
  })
  email!: string;

  @ApiPropertyOptional({ example: '+380991112233' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Matches(/^\+?[0-9\s()-]{7,20}$/, {
    message: 'Invalid phone number format',
  })
  phone?: string;

  @ApiProperty({ example: 'Офіціант' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[a-zA-Zа-яА-ЯіІїЇєЄґҐ\s-]+$/, {
    message: 'Role can only contain letters and spaces',
  })
  role!: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  photo?: string;

  @ApiPropertyOptional({ example: '123456' })
  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(100)
  @Matches(/^[^\u0400-\u04FF]+$/, {
    message: 'Password must not contain Cyrillic characters',
  })
  password?: string;

  @ApiPropertyOptional({ example: 50.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyRate?: number;

  @ApiPropertyOptional({ example: 3.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  salesPercentage?: number;
}
