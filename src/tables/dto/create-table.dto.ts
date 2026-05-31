// src/tables/dto/create-table.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TableStatus } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class CreateTableDto {
  @ApiProperty({ example: 12, minimum: 1 })
  @IsInt()
  @Min(1)
  number!: number;

  @ApiPropertyOptional({
    enum: TableStatus,
    example: TableStatus.ACTIVE,
    default: TableStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(TableStatus)
  status?: TableStatus;

  @ApiProperty({
    example: 'TERRACE',
    description: 'Table type, e.g. BAR, TERRACE, HALL',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  type!: string;

  // ДОДАЄМО ЦЕ ПОЛЕ ДЛЯ ЗВ'ЯЗКУ З ЗОНАМИ
  @ApiPropertyOptional({ example: 'uuid-zone-string' })
  @IsOptional()
  @IsUUID()
  zoneId?: string;
}