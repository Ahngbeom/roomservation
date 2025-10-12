import { IsNotEmpty, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AvailabilityQueryDto {
  @ApiProperty({
    description: '조회할 날짜 (YYYY-MM-DD 형식)',
    example: '2025-10-15',
  })
  @IsNotEmpty()
  @IsDateString()
  date: string;
}
