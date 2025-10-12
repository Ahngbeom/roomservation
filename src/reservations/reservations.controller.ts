import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { CancelReservationDto } from './dto/cancel-reservation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';

@ApiTags('reservations')
@ApiBearerAuth('access-token')
@Controller('api/reservations')
@UseGuards(JwtAuthGuard)
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '예약 신청',
    description: '새로운 예약을 신청합니다',
  })
  @ApiResponse({ status: 201, description: '예약 생성 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청 데이터' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({
    status: 409,
    description: '예약 충돌 (해당 시간대에 이미 예약 존재)',
  })
  async create(
    @Body() createReservationDto: CreateReservationDto,
    @CurrentUser('id') userId: string,
  ) {
    return await this.reservationsService.create(createReservationDto, userId);
  }

  @Get()
  @ApiOperation({
    summary: '내 예약 목록 조회',
    description: '현재 로그인한 사용자의 예약 목록을 조회합니다',
  })
  @ApiResponse({ status: 200, description: '예약 목록 조회 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async findAll(@CurrentUser('id') userId: string) {
    return await this.reservationsService.findAll(userId);
  }

  @Get('room/:roomId')
  @ApiOperation({
    summary: '특정 방의 예약 현황 조회',
    description: '특정 방의 모든 예약 현황을 조회합니다',
  })
  @ApiParam({
    name: 'roomId',
    description: '방 ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({ status: 200, description: '예약 현황 조회 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 404, description: '방을 찾을 수 없음' })
  async findByRoomId(@Param('roomId') roomId: string) {
    return await this.reservationsService.findByRoomId(roomId);
  }

  @Get(':id')
  @ApiOperation({
    summary: '예약 상세 조회',
    description: '특정 예약의 상세 정보를 조회합니다',
  })
  @ApiParam({
    name: 'id',
    description: '예약 ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({ status: 200, description: '예약 조회 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({
    status: 403,
    description: '권한 없음 (자신의 예약만 조회 가능)',
  })
  @ApiResponse({ status: 404, description: '예약을 찾을 수 없음' })
  async findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return await this.reservationsService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: '예약 변경',
    description: '예약 정보를 변경합니다 (예약 시작 1시간 전까지만 가능)',
  })
  @ApiParam({
    name: 'id',
    description: '예약 ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({ status: 200, description: '예약 변경 성공' })
  @ApiResponse({
    status: 400,
    description: '잘못된 요청 데이터 또는 변경 불가 시간',
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({
    status: 403,
    description: '권한 없음 (자신의 예약만 변경 가능)',
  })
  @ApiResponse({ status: 404, description: '예약을 찾을 수 없음' })
  @ApiResponse({ status: 409, description: '예약 충돌' })
  async update(
    @Param('id') id: string,
    @Body() updateReservationDto: UpdateReservationDto,
    @CurrentUser('id') userId: string,
  ) {
    return await this.reservationsService.update(
      id,
      updateReservationDto,
      userId,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '예약 취소',
    description: '예약을 취소합니다 (예약 시작 30분 전까지만 가능)',
  })
  @ApiParam({
    name: 'id',
    description: '예약 ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({ status: 200, description: '예약 취소 성공' })
  @ApiResponse({ status: 400, description: '취소 불가 시간' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({
    status: 403,
    description: '권한 없음 (자신의 예약만 취소 가능)',
  })
  @ApiResponse({ status: 404, description: '예약을 찾을 수 없음' })
  async cancel(
    @Param('id') id: string,
    @Body() cancelDto: CancelReservationDto,
    @CurrentUser('id') userId: string,
  ) {
    return await this.reservationsService.cancel(id, cancelDto, userId);
  }

  @Post(':id/confirm')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '예약 확정',
    description: '예약을 확정합니다 (관리자 전용)',
  })
  @ApiParam({
    name: 'id',
    description: '예약 ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({ status: 200, description: '예약 확정 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한 없음 (관리자만 가능)' })
  @ApiResponse({ status: 404, description: '예약을 찾을 수 없음' })
  async confirm(@Param('id') id: string) {
    return await this.reservationsService.confirm(id);
  }
}
