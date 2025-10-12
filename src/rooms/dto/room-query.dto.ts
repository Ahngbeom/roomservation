import { IsOptional, IsNumber, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class RoomQueryDto {
  @ApiProperty({
    description: '최소 수용 인원',
    example: 5,
    required: false,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  minCapacity?: number;

  @ApiProperty({
    description: '위치로 필터링',
    example: '본관 3층',
    required: false,
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({
    description: '시설로 필터링 (콤마로 구분)',
    example: '프로젝터,화이트보드',
    required: false,
  })
  @IsOptional()
  @IsString()
  facilities?: string;
}
