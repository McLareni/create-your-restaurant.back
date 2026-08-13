import { IsOptional, IsDateString } from 'class-validator';

export class GetAnalyticsDto {
  @IsOptional()
  @IsDateString({}, { message: 'errors.invalid_start_date' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'errors.invalid_end_date' })
  endDate?: string;
}
