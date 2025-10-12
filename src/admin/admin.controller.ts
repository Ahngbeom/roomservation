import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import {
  AdminUserQueryDto,
  AdminReservationQueryDto,
} from './dto/admin-query.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

@ApiTags('admin')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('api/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @ApiOperation({
    summary: '모든 사용자 조회',
    description:
      '관리자가 모든 사용자 목록을 조회합니다. 페이지네이션과 역할 필터링을 지원합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '사용자 목록 조회 성공',
    schema: {
      example: {
        data: [
          {
            id: 1,
            email: 'user@example.com',
            name: '홍길동',
            role: 'USER',
            createdAt: '2025-10-11T00:00:00.000Z',
            updatedAt: '2025-10-11T00:00:00.000Z',
          },
        ],
        pagination: {
          total: 50,
          page: 1,
          limit: 10,
          totalPages: 5,
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: '관리자 권한 없음',
  })
  async getAllUsers(@Query() query: AdminUserQueryDto) {
    return this.adminService.getAllUsers(query);
  }

  @Get('reservations')
  @ApiOperation({
    summary: '모든 예약 조회',
    description:
      '관리자가 모든 예약 목록을 조회합니다. 다양한 필터와 페이지네이션을 지원합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '예약 목록 조회 성공',
    schema: {
      example: {
        data: [
          {
            id: 1,
            startTime: '2025-10-11T09:00:00.000Z',
            endTime: '2025-10-11T10:00:00.000Z',
            purpose: '회의',
            status: 'CONFIRMED',
            room: {
              id: 1,
              name: '회의실 A',
              capacity: 10,
            },
            user: {
              id: 1,
              email: 'user@example.com',
              name: '홍길동',
            },
            createdAt: '2025-10-10T00:00:00.000Z',
            updatedAt: '2025-10-10T00:00:00.000Z',
          },
        ],
        pagination: {
          total: 100,
          page: 1,
          limit: 10,
          totalPages: 10,
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: '관리자 권한 없음',
  })
  async getAllReservations(@Query() query: AdminReservationQueryDto) {
    return this.adminService.getAllReservations(query);
  }

  @Get('statistics')
  @ApiOperation({
    summary: '통계 조회',
    description:
      '관리자가 시스템 전체 통계를 조회합니다. 사용자, 방, 예약 등의 통계 정보를 제공합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '통계 조회 성공',
    schema: {
      example: {
        overview: {
          totalUsers: 100,
          totalRooms: 10,
          totalReservations: 500,
        },
        usersByRole: {
          USER: 95,
          ADMIN: 5,
        },
        reservationsByStatus: {
          CONFIRMED: 50,
          COMPLETED: 400,
          CANCELLED: 30,
          NO_SHOW: 20,
        },
        topRoomsByReservations: [
          {
            roomId: 1,
            roomName: '회의실 A',
            reservationCount: 150,
          },
        ],
        dailyReservations: [
          {
            date: '2025-10-04',
            count: 15,
          },
        ],
        currentMonthStats: {
          total: 80,
          completed: 50,
          cancelled: 20,
          noshow: 10,
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: '관리자 권한 없음',
  })
  async getStatistics() {
    return this.adminService.getStatistics();
  }

  @Patch('users/:id/role')
  @ApiOperation({
    summary: '사용자 역할 변경',
    description: '관리자가 특정 사용자의 역할을 변경합니다.',
  })
  @ApiParam({
    name: 'id',
    description: '사용자 ID (UUID)',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: '사용자 역할 변경 성공',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'user@example.com',
        name: '홍길동',
        role: 'ADMIN',
        createdAt: '2025-10-11T00:00:00.000Z',
        updatedAt: '2025-10-11T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: '관리자 권한 없음',
  })
  @ApiResponse({
    status: 404,
    description: '사용자를 찾을 수 없음',
  })
  async updateUserRole(
    @Param('id') id: string,
    @Body() updateUserRoleDto: UpdateUserRoleDto,
  ) {
    return this.adminService.updateUserRole(id, updateUserRoleDto);
  }
}
