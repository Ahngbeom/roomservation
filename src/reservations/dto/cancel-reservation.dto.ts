import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CancelReservationDto {
  @ApiProperty({
    description: '예약 취소 사유',
    example: '일정이 변경되어 예약을 취소합니다',
  })
  @IsString()
  @IsNotEmpty()
  cancellationReason: string;
}
