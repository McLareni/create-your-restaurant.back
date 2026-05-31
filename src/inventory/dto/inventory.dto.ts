import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateInventoryItemDto {
  @ApiProperty({ example: 'Помідори' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 15.5, description: 'Кількість на складі' })
  @IsNumber()
  @Min(0)
  stock!: number;

  @ApiProperty({ example: 'кг' })
  @IsString()
  @IsNotEmpty()
  unit!: string;
}

export class UpdateInventoryItemDto {
  @ApiPropertyOptional({ example: 'Помідори Черрі' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ example: 'кг' })
  @IsOptional()
  @IsString()
  unit?: string;
}