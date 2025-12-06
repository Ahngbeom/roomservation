# 👨‍💼 Admin 도메인 (관리자 기능)

## 📋 목차
- [개요](#개요)
- [도메인 간 관계](#도메인-간-관계)
- [핵심 기능](#핵심-기능)
- [통계 기능](#통계-기능)
- [API 엔드포인트](#api-엔드포인트)
- [보안 및 권한](#보안-및-권한)
- [코드 위치](#코드-위치)
- [데이터 구조](#데이터-구조)

---

## 개요

Admin 도메인은 관리자 전용 기능을 제공하는 모듈입니다.

### 주요 책임
- 전체 사용자 관리 및 조회
- 전체 예약 관리 및 조회
- 시스템 통계 제공
- 사용자 역할 변경
- 페이지네이션 및 필터링

---

## 도메인 간 관계

이 도메인의 다른 도메인과의 관계는 [README.md의 아키텍처 섹션](README.md#아키텍처-및-도메인-관계)을 참고하세요.

---

## 핵심 기능

### 1. 모든 사용자 조회 (Get All Users)
**위치**: `src/admin/admin.controller.ts:67`, `src/admin/admin.service.ts:30`

```typescript
GET /api/admin/users?page=1&limit=10&role=USER
```

**권한**: 관리자 전용 (`@UseGuards(AdminGuard)`)

**기능**
- 전체 사용자 목록 조회
- 페이지네이션 지원
- 역할별 필터링

#### 쿼리 파라미터

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| page | number | ❌ | 1 | 페이지 번호 |
| limit | number | ❌ | 10 | 페이지당 항목 수 |
| role | UserRole | ❌ | - | 역할 필터 (USER \| ADMIN) |

#### 응답 구조

```typescript
{
  data: User[];           // 사용자 목록 (비밀번호 제외)
  pagination: {
    total: number;        // 전체 사용자 수
    page: number;         // 현재 페이지
    limit: number;        // 페이지당 항목 수
    totalPages: number;   // 전체 페이지 수
  };
}
```

#### 구현 로직

```typescript
const { page = 1, limit = 10, role } = query;
const skip = (page - 1) * limit;

const where: FindOptionsWhere<User> = {};
if (role) {
  where.role = role;
}

const [users, total] = await this.userRepository.findAndCount({
  where,
  skip,
  take: limit,
  order: { createdAt: 'DESC' }
});

// 비밀번호 제거
return {
  data: users.map((user) => {
    const { password: _password, ...result } = user;
    return result;
  }),
  pagination: {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  }
};
```

#### 응답 예시

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "name": "홍길동",
      "phone": "010-1234-5678",
      "role": "USER",
      "department": "개발팀",
      "createdAt": "2025-10-11T00:00:00.000Z",
      "updatedAt": "2025-10-11T00:00:00.000Z"
    },
    ...
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

---

### 2. 모든 예약 조회 (Get All Reservations)
**위치**: `src/admin/admin.controller.ts:116`, `src/admin/admin.service.ts:60`

```typescript
GET /api/admin/reservations?page=1&limit=10&status=CONFIRMED&roomId=xxx&userId=yyy&startDate=2025-10-01&endDate=2025-10-31
```

**권한**: 관리자 전용

**기능**
- 전체 예약 목록 조회
- 페이지네이션 지원
- 다양한 필터링 옵션

#### 쿼리 파라미터

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| page | number | ❌ | 1 | 페이지 번호 |
| limit | number | ❌ | 10 | 페이지당 항목 수 |
| status | ReservationStatus | ❌ | - | 예약 상태 필터 |
| roomId | string | ❌ | - | 방 ID 필터 |
| userId | string | ❌ | - | 사용자 ID 필터 |
| startDate | string | ❌ | - | 시작 날짜 필터 (YYYY-MM-DD) |
| endDate | string | ❌ | - | 종료 날짜 필터 (YYYY-MM-DD) |

#### 날짜 필터링 로직

```typescript
if (startDate && endDate) {
  // 기간 지정 (startDate ~ endDate)
  where.startTime = Between(new Date(startDate), new Date(endDate));
} else if (startDate) {
  // 시작 날짜 이후 (startDate ~ 2100-01-01)
  where.startTime = Between(new Date(startDate), new Date('2100-01-01'));
} else if (endDate) {
  // 종료 날짜 이전 (2000-01-01 ~ endDate)
  where.startTime = Between(new Date('2000-01-01'), new Date(endDate));
}
```

#### 응답 구조

```typescript
{
  data: Reservation[];    // 예약 목록 (user, room 포함)
  pagination: {
    total: number;        // 전체 예약 수
    page: number;         // 현재 페이지
    limit: number;        // 페이지당 항목 수
    totalPages: number;   // 전체 페이지 수
  };
}
```

#### 응답 예시

```json
{
  "data": [
    {
      "id": "abc123...",
      "title": "프로젝트 미팅",
      "purpose": "킥오프 미팅",
      "startTime": "2025-10-15T10:00:00Z",
      "endTime": "2025-10-15T12:00:00Z",
      "attendees": 15,
      "status": "CONFIRMED",
      "room": {
        "id": "room123...",
        "name": "대회의실",
        "location": "3층",
        "capacity": 20
      },
      "user": {
        "id": "user123...",
        "email": "user@example.com",
        "name": "홍길동",
        "department": "개발팀"
      },
      "createdAt": "2025-10-10T00:00:00Z",
      "updatedAt": "2025-10-10T00:00:00Z"
    },
    ...
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

---

### 3. 통계 조회 (Get Statistics)
**위치**: `src/admin/admin.controller.ts:172`, `src/admin/admin.service.ts:122`

```typescript
GET /api/admin/statistics
```

**권한**: 관리자 전용

**기능**
- 시스템 전체 통계 제공
- 다양한 집계 및 분석
- Redis 캐싱 (5분)

#### 통계 항목

**a. 전체 개요 (Overview)**
```typescript
overview: {
  totalUsers: number;          // 전체 사용자 수
  totalRooms: number;          // 전체 방 수
  totalReservations: number;   // 전체 예약 수
}
```

**b. 사용자 역할별 통계**
```typescript
usersByRole: {
  USER: number;   // 일반 사용자 수
  ADMIN: number;  // 관리자 수
}
```

**구현**
```typescript
const usersByRole = await this.userRepository
  .createQueryBuilder('user')
  .select('user.role', 'role')
  .addSelect('COUNT(*)', 'count')
  .groupBy('user.role')
  .getRawMany();

// 결과 변환
usersByRole.reduce((acc, item) => {
  acc[item.role] = parseInt(item.count);
  return acc;
}, {});
```

**c. 예약 상태별 통계**
```typescript
reservationsByStatus: {
  PENDING: number;
  CONFIRMED: number;
  CANCELLED: number;
  COMPLETED: number;
  NO_SHOW: number;
}
```

**구현**
```typescript
const reservationsByStatus = await this.reservationRepository
  .createQueryBuilder('reservation')
  .select('reservation.status', 'status')
  .addSelect('COUNT(*)', 'count')
  .groupBy('reservation.status')
  .getRawMany();
```

**d. 방별 예약 통계 (TOP 5)**
```typescript
topRoomsByReservations: [
  {
    roomId: string;
    roomName: string;
    reservationCount: number;
  }
]
```

**구현**
```typescript
const topRoomsByReservations = await this.reservationRepository
  .createQueryBuilder('reservation')
  .leftJoinAndSelect('reservation.room', 'room')
  .select('room.id', 'roomId')
  .addSelect('room.name', 'roomName')
  .addSelect('COUNT(*)', 'reservationCount')
  .groupBy('room.id')
  .addGroupBy('room.name')
  .orderBy('COUNT(*)', 'DESC')
  .limit(5)
  .getRawMany();
```

**e. 최근 7일 일별 예약 통계**
```typescript
dailyReservations: [
  {
    date: string;    // YYYY-MM-DD
    count: number;
  }
]
```

**구현**
```typescript
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

const dailyReservations = await this.reservationRepository
  .createQueryBuilder('reservation')
  .select('DATE(reservation.startTime)', 'date')
  .addSelect('COUNT(*)', 'count')
  .where('reservation.startTime >= :sevenDaysAgo', { sevenDaysAgo })
  .groupBy('DATE(reservation.startTime)')
  .orderBy('DATE(reservation.startTime)', 'ASC')
  .getRawMany();
```

**f. 당월 예약 통계**
```typescript
currentMonthStats: {
  total: number;       // 당월 전체 예약 수
  completed: number;   // 당월 완료 예약 수
  cancelled: number;   // 당월 취소 예약 수
}
```

**구현**
```typescript
const currentMonth = new Date();
currentMonth.setDate(1);
currentMonth.setHours(0, 0, 0, 0);

const monthlyStats = await this.reservationRepository
  .createQueryBuilder('reservation')
  .select('COUNT(*)', 'totalReservations')
  .addSelect(
    'SUM(CASE WHEN reservation.status = :completed THEN 1 ELSE 0 END)',
    'completedReservations'
  )
  .addSelect(
    'SUM(CASE WHEN reservation.status = :cancelled THEN 1 ELSE 0 END)',
    'cancelledReservations'
  )
  .where('reservation.startTime >= :currentMonth', { currentMonth })
  .setParameters({
    completed: ReservationStatus.COMPLETED,
    cancelled: ReservationStatus.CANCELLED
  })
  .getRawOne();
```

#### Redis 캐싱

```typescript
// 캐시 확인
const cached = await this.cacheService.get(CACHE_KEYS.STATISTICS);
if (cached) {
  return cached;
}

// ... 통계 계산 ...

// 캐시 저장 (5분)
await this.cacheService.set(
  CACHE_KEYS.STATISTICS,
  result,
  CACHE_TTL.MEDIUM  // 5분
);
```

**캐싱 이유**
- 복잡한 집계 쿼리 (7개 쿼리)
- 실시간성 불필요 (5분 지연 허용)
- 관리자 대시보드 성능 향상

#### 응답 예시

```json
{
  "overview": {
    "totalUsers": 100,
    "totalRooms": 10,
    "totalReservations": 500
  },
  "usersByRole": {
    "USER": 95,
    "ADMIN": 5
  },
  "reservationsByStatus": {
    "PENDING": 10,
    "CONFIRMED": 50,
    "COMPLETED": 400,
    "CANCELLED": 30,
    "NO_SHOW": 10
  },
  "topRoomsByReservations": [
    {
      "roomId": "room1",
      "roomName": "대회의실",
      "reservationCount": 150
    },
    {
      "roomId": "room2",
      "roomName": "소회의실 A",
      "reservationCount": 120
    }
  ],
  "dailyReservations": [
    { "date": "2025-10-08", "count": 12 },
    { "date": "2025-10-09", "count": 15 },
    { "date": "2025-10-10", "count": 18 }
  ],
  "currentMonthStats": {
    "total": 80,
    "completed": 50,
    "cancelled": 20
  }
}
```

---

### 4. 사용자 역할 변경 (Update User Role)
**위치**: `src/admin/admin.controller.ts:208`, `src/admin/admin.service.ts:245`

```typescript
PATCH /api/admin/users/:id/role
```

**권한**: 관리자 전용

**기능**
- 특정 사용자의 역할 변경
- USER ↔ ADMIN 변경 가능

#### 요청 Body

```json
{
  "role": "ADMIN"
}
```

#### 구현 로직

```typescript
async updateUserRole(userId: string, updateUserRoleDto: UpdateUserRoleDto) {
  // 사용자 존재 확인
  const user = await this.usersService.findById(userId);

  // 역할 업데이트
  return this.usersService.update(userId, {
    role: updateUserRoleDto.role
  });
}
```

#### 응답 예시

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "홍길동",
  "phone": "010-1234-5678",
  "role": "ADMIN",
  "department": "개발팀",
  "createdAt": "2025-10-11T00:00:00.000Z",
  "updatedAt": "2025-10-12T10:30:00.000Z"
}
```

---

## 통계 기능

### 집계 쿼리 성능

| 통계 항목 | 쿼리 복잡도 | 예상 실행 시간 |
|----------|------------|---------------|
| 전체 개요 | 낮음 (COUNT) | ~10ms |
| 역할별 통계 | 낮음 (GROUP BY) | ~20ms |
| 상태별 통계 | 낮음 (GROUP BY) | ~30ms |
| 방별 TOP 5 | 중간 (JOIN + GROUP BY + LIMIT) | ~50ms |
| 7일 일별 통계 | 중간 (DATE + GROUP BY) | ~40ms |
| 당월 통계 | 중간 (CASE WHEN + SUM) | ~30ms |
| **전체** | - | **~180ms** |

**캐싱 효과**
- 캐시 HIT: ~5ms (Redis)
- 캐시 MISS: ~180ms (DB 7개 쿼리)
- **성능 향상**: 약 36배

---

### 통계 활용

#### 1. 관리자 대시보드
- 실시간 현황 모니터링
- 주요 지표 한눈에 파악
- 트렌드 분석

#### 2. 의사 결정 지원
- 방 추가/제거 결정 (이용률 기반)
- 사용자 패턴 분석
- 노쇼 사용자 관리

#### 3. 리포트 생성
- 월간/분기별 리포트
- 부서별 이용 현황
- 비용 절감 분석

---

## API 엔드포인트

| 메서드 | 경로 | 권한 | 설명 |
|--------|------|------|------|
| GET | `/api/admin/users` | 🔑 ADMIN | 전체 사용자 조회 (페이지네이션) |
| GET | `/api/admin/reservations` | 🔑 ADMIN | 전체 예약 조회 (필터링) |
| GET | `/api/admin/statistics` | 🔑 ADMIN | 시스템 통계 조회 |
| PATCH | `/api/admin/users/:id/role` | 🔑 ADMIN | 사용자 역할 변경 |

---

## 보안 및 권한

### AdminGuard
**위치**: `src/admin/guards/admin.guard.ts`

```typescript
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {}
```

**검증 순서**
1. `JwtAuthGuard`: JWT 토큰 인증
2. `AdminGuard`: 관리자 권한 확인

**AdminGuard 구현**
```typescript
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('관리자 권한이 필요합니다');
    }

    return true;
  }
}
```

### 권한 매트릭스

| 작업 | USER | ADMIN |
|------|------|-------|
| 전체 사용자 조회 | ❌ | ✅ |
| 전체 예약 조회 | ❌ | ✅ |
| 통계 조회 | ❌ | ✅ |
| 사용자 역할 변경 | ❌ | ✅ |

### 데이터 보안

#### 1. 비밀번호 제거
```typescript
// 사용자 목록 조회 시
data: users.map((user) => {
  const { password: _password, ...result } = user;
  return result;
})
```

#### 2. Relations 조회 시
```typescript
// 예약 목록 조회 시 사용자 비밀번호 제거
const { user, ...rest } = reservation;
const { password: _password, ...userWithoutPassword } = user;
```

---

## 코드 위치

### 컨트롤러
- **경로**: `src/admin/admin.controller.ts`
- **라인 수**: 215줄
- **엔드포인트**: 4개

### 서비스
- **경로**: `src/admin/admin.service.ts`
- **라인 수**: 250줄
- **메서드**: 4개

### 가드
- **경로**: `src/admin/guards/admin.guard.ts`
- **역할**: 관리자 권한 검증

### DTO
- `src/admin/dto/admin-query.dto.ts` - 쿼리 파라미터 (사용자, 예약)
- `src/admin/dto/update-user-role.dto.ts` - 역할 변경

---

## 데이터 구조

### AdminUserQueryDto

```typescript
{
  page?: number;      // 페이지 번호 (기본값: 1)
  limit?: number;     // 페이지당 항목 수 (기본값: 10)
  role?: UserRole;    // 역할 필터 (USER | ADMIN)
}
```

### AdminReservationQueryDto

```typescript
{
  page?: number;              // 페이지 번호
  limit?: number;             // 페이지당 항목 수
  status?: ReservationStatus; // 예약 상태 필터
  roomId?: string;            // 방 ID 필터
  userId?: string;            // 사용자 ID 필터
  startDate?: string;         // 시작 날짜 (YYYY-MM-DD)
  endDate?: string;           // 종료 날짜 (YYYY-MM-DD)
}
```

### UpdateUserRoleDto

```typescript
{
  role: UserRole;  // USER | ADMIN
}
```

---

## 주요 의존성

- `UsersService` - 사용자 관리
- `ReservationsService` - 예약 관리
- `RoomsService` - 방 관리
- `CacheService` - Redis 캐싱
- `@nestjs/typeorm` - TypeORM 통합

---

## 테스트

### 단위 테스트
- **파일**: `src/admin/admin.service.spec.ts`
- **커버리지**: AdminService의 모든 메서드

### E2E 테스트
- **파일**: `test/admin.e2e-spec.ts`
- **테스트 케이스**: 10개
- **커버리지**:
  - 사용자 조회 (페이지네이션, 필터링)
  - 예약 조회 (날짜 필터, 상태 필터)
  - 통계 조회
  - 역할 변경 (권한 검증)

---

## 성능 최적화

### 1. 페이지네이션
```typescript
const skip = (page - 1) * limit;

findAndCount({
  skip,
  take: limit
});
```
- 대량 데이터 조회 시 메모리 절약
- 네트워크 대역폭 절약

### 2. Redis 캐싱
```typescript
CACHE_KEYS.STATISTICS: 'statistics'
CACHE_TTL.MEDIUM: 5분
```
- 복잡한 집계 쿼리 캐싱
- 관리자 대시보드 빠른 응답

### 3. 인덱스 최적화
```sql
-- 사용자 조회
CREATE INDEX idx_users_role ON users (role, created_at DESC);

-- 예약 조회
CREATE INDEX idx_reservations_admin ON reservations (status, start_time DESC);
CREATE INDEX idx_reservations_room_user ON reservations (room_id, user_id);
```

---

## 다음 개선 사항

1. **대시보드 확장**
   - 실시간 차트 (Chart.js)
   - 시간대별 이용 히트맵
   - 예측 분석 (ML)

2. **엑셀 내보내기**
   - 사용자 목록 엑셀 다운로드
   - 예약 현황 엑셀 리포트
   - 통계 데이터 CSV

3. **감사 로그**
   - 관리자 작업 기록
   - 변경 이력 추적
   - 보안 모니터링

4. **알림 관리**
   - 시스템 공지사항 발송
   - 사용자별 푸시 알림
   - 이메일 캠페인

5. **고급 필터**
   - 부서별 사용자 조회
   - 노쇼 사용자 필터
   - 예약 빈도 분석

6. **배치 작업**
   - 대량 역할 변경
   - 대량 예약 취소
   - 정기 데이터 정리

7. **권한 세분화**
   - Super Admin
   - Department Admin
   - Read-Only Admin
