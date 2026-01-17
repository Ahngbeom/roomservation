import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AccessService } from './access.service';
import { GenerateAccessTokenDto } from './dto/generate-access-token.dto';
import { VerifyAccessTokenDto } from './dto/verify-access-token.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('access')
@ApiBearerAuth('access-token')
@Controller('api/access')
@UseGuards(JwtAuthGuard)
export class AccessController {
  constructor(private readonly accessService: AccessService) {}

  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '입장 토큰 생성',
    description: '예약 기반으로 방 입장 토큰(QR 또는 PIN)을 생성합니다',
  })
  @ApiResponse({ status: 201, description: '입장 토큰 생성 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청 데이터' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한 없음 (자신의 예약만 가능)' })
  @ApiResponse({ status: 404, description: '예약을 찾을 수 없음' })
  async generateAccessToken(
    @Body() generateDto: GenerateAccessTokenDto,
    @CurrentUser('id') userId: string,
  ) {
    const roomAccess = await this.accessService.generateAccessToken(generateDto, userId);

    return {
      message: '입장 토큰이 생성되었습니다',
      roomAccess,
    };
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '입장 토큰 검증',
    description: '입장 토큰을 검증하고 출입을 승인합니다',
  })
  @ApiResponse({ status: 200, description: '입장 토큰 검증 성공, 출입 승인' })
  @ApiResponse({ status: 400, description: '잘못된 요청 데이터' })
  @ApiResponse({
    status: 401,
    description: '유효하지 않은 토큰 또는 만료된 토큰',
  })
  async verifyAccessToken(@Body() verifyDto: VerifyAccessTokenDto) {
    return await this.accessService.verifyAccessToken(verifyDto);
  }

  @Get('history')
  @ApiOperation({
    summary: '내 출입 기록 조회',
    description: '현재 로그인한 사용자의 출입 기록을 조회합니다',
  })
  @ApiResponse({ status: 200, description: '출입 기록 조회 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async getAccessHistory(@CurrentUser('id') userId: string) {
    return await this.accessService.getAccessHistory(userId);
  }

  @Get('room/:roomId/current')
  @ApiOperation({
    summary: '방 현재 사용 상태 조회',
    description: '특정 방의 현재 사용 상태를 조회합니다',
  })
  @ApiParam({
    name: 'roomId',
    description: '방 ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({ status: 200, description: '방 사용 상태 조회 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 404, description: '방을 찾을 수 없음' })
  async getCurrentRoomStatus(@Param('roomId') roomId: string) {
    return await this.accessService.getCurrentRoomStatus(roomId);
  }
}
