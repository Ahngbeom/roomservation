import { IsUUID, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AccessMethod } from '../room-access.entity';

export class GenerateAccessTokenDto {
  @ApiProperty({
    description: '예약 ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  reservationId: string;

  @ApiProperty({
    description: '입장 방법',
    enum: AccessMethod,
    example: AccessMethod.QR,
  })
  @IsEnum(AccessMethod)
  accessMethod: AccessMethod;
}
