import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyAccessTokenDto {
  @ApiProperty({
    description: '입장 토큰 (QR 코드 또는 PIN)',
    example: 'abc123def456',
  })
  @IsString()
  @IsNotEmpty()
  accessToken: string;
}
