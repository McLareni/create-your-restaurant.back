import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateLookupDto {
  @IsString({ message: 'errors.validation_string' })
  @IsNotEmpty({ message: 'errors.validation_required' })
  @MaxLength(60, { message: 'errors.validation_max_length' })
  name!: string;
}
