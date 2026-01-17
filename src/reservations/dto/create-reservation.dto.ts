import { IsString, IsNotEmpty, IsNumber, IsDateString, Min, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReservationDto {
  @ApiProperty({
    description: '예약할 방의 ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  roomId: string;

  @ApiProperty({
    description: '예약 제목',
    example: '팀 회의',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: '예약 목적',
    example: '프로젝트 진행 상황 논의',
  })
  @IsString()
  @IsNotEmpty()
  purpose: string;

  @ApiProperty({
    description: '예약 시작 시간 (ISO 8601 형식)',
    example: '2025-10-15T09:00:00Z',
  })
  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({
    description: '예약 종료 시간 (ISO 8601 형식)',
    example: '2025-10-15T11:00:00Z',
  })
  @IsDateString()
  @IsNotEmpty()
  endTime: string;

  @ApiProperty({
    description: '참석 인원',
    example: 5,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  attendees: number;
}
