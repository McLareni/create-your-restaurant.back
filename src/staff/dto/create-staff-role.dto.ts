import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, Matches } from 'class-validator';

export class CreateStaffRoleDto {
  @ApiProperty({ example: 'Офіціант' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[a-zA-Zа-яА-ЯіІїЇєЄґҐ\s'’-]+$/, {
    message:
      'Staff role name can only contain letters, spaces, hyphens, and apostrophes',
  })
  name!: string;
}
