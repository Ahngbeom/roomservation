import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { RoomQueryDto } from './dto/room-query.dto';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@ApiTags('rooms')
@ApiBearerAuth('access-token')
@Controller('api/rooms')
@UseGuards(JwtAuthGuard)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '방 생성',
    description: '새로운 방을 생성합니다 (관리자 전용)',
  })
  @ApiResponse({ status: 201, description: '방 생성 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청 데이터' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한 없음 (관리자만 가능)' })
  async create(@Body() createRoomDto: CreateRoomDto) {
    return await this.roomsService.create(createRoomDto);
  }

  @Get()
  @ApiOperation({
    summary: '방 목록 조회',
    description: '방 목록을 조회합니다. 수용인원, 시설, 위치로 필터링 가능합니다',
  })
  @ApiResponse({ status: 200, description: '방 목록 조회 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async findAll(@Query() query: RoomQueryDto) {
    return await this.roomsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: '방 상세 조회',
    description: '특정 방의 상세 정보를 조회합니다',
  })
  @ApiParam({
    name: 'id',
    description: '방 ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({ status: 200, description: '방 조회 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 404, description: '방을 찾을 수 없음' })
  async findOne(@Param('id') id: string) {
    return await this.roomsService.findOne(id);
  }

  @Get(':id/availability')
  @ApiOperation({
    summary: '방 예약 가능 시간대 조회',
    description: '특정 방의 특정 날짜에 대한 예약 가능 시간대를 조회합니다',
  })
  @ApiParam({
    name: 'id',
    description: '방 ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({ status: 200, description: '예약 가능 시간대 조회 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 404, description: '방을 찾을 수 없음' })
  async getAvailability(@Param('id') id: string, @Query() query: AvailabilityQueryDto) {
    return await this.roomsService.getAvailability(id, query.date);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: '방 정보 수정',
    description: '방 정보를 수정합니다 (관리자 전용)',
  })
  @ApiParam({
    name: 'id',
    description: '방 ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({ status: 200, description: '방 수정 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청 데이터' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한 없음 (관리자만 가능)' })
  @ApiResponse({ status: 404, description: '방을 찾을 수 없음' })
  async update(@Param('id') id: string, @Body() updateRoomDto: UpdateRoomDto) {
    return await this.roomsService.update(id, updateRoomDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '방 삭제/비활성화',
    description: '방을 삭제하거나 비활성화합니다 (관리자 전용)',
  })
  @ApiParam({
    name: 'id',
    description: '방 ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({ status: 204, description: '방 삭제 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한 없음 (관리자만 가능)' })
  @ApiResponse({ status: 404, description: '방을 찾을 수 없음' })
  async remove(@Param('id') id: string) {
    await this.roomsService.remove(id);
  }
}
