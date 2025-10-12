import {
  IsString,
  IsNumber,
  IsArray,
  IsNotEmpty,
  Min,
  IsObject,
  ValidateNested,
  IsBoolean,
  IsOptional,
  ArrayMinSize,
  ArrayMaxSize,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class OperatingHoursDto {
  @ApiProperty({
    description: '운영 시작 시간 (HH:mm 형식)',
    example: '09:00',
    pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$',
  })
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime must be in HH:mm format',
  })
  startTime: string;

  @ApiProperty({
    description: '운영 종료 시간 (HH:mm 형식)',
    example: '18:00',
    pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$',
  })
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'endTime must be in HH:mm format',
  })
  endTime: string;

  @ApiProperty({
    description: '운영 요일 (0: 일요일, 1: 월요일, ..., 6: 토요일)',
    example: [1, 2, 3, 4, 5],
    type: [Number],
    minItems: 1,
    maxItems: 7,
  })
  @IsArray()
  @IsNumber({}, { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  weekdays: number[];
}

export class CreateRoomDto {
  @ApiProperty({
    description: '방 번호 (호실)',
    example: '301',
  })
  @IsString()
  @IsNotEmpty()
  roomNumber: string;

  @ApiProperty({
    description: '방 이름',
    example: '대회의실',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: '수용 인원',
    example: 10,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  capacity: number;

  @ApiProperty({
    description: '위치 (건물, 층)',
    example: '본관 3층',
  })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({
    description: '시설 목록',
    example: ['프로젝터', '화이트보드', '스피커'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  facilities: string[];

  @ApiProperty({
    description: '운영 시간',
    type: OperatingHoursDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => OperatingHoursDto)
  operatingHours: OperatingHoursDto;

  @ApiProperty({
    description: '활성화 상태',
    example: true,
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
