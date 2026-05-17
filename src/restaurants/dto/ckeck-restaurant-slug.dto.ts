import { IsString, MaxLength, MinLength } from 'class-validator';

export class CheckSlugDto {
  @MinLength(1)
  @MaxLength(120)
  @IsString()
  slug!: string;
}
