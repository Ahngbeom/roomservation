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

## 도메인 간 연관 관계

### 역할
**"전체 시스템 관리 및 통계 제공"**

Admin 도메인은 시스템 전반을 관리자 관점에서 조회하고 분석하며, 통계를 제공하고 사용자 권한을 관리하는 역할을 담당합니다.

---

### 비즈니스 연관 관계

#### 📊 Auth (인증/권한)
**관계**: 관리자 권한 검증
- Auth는 Admin에게 **관리자 전용 접근 제어**를 제공
- **비즈니스 의미**:
  - ADMIN 역할만 관리 기능 접근 가능
  - 일반 USER는 관리 API 호출 불가
  - 이중 가드 적용 (JWT + AdminGuard)
- **권한 체계**:
  - JwtAuthGuard: 인증된 사용자인지 확인
  - AdminGuard: ADMIN 역할인지 확인

**비즈니스 흐름**
```
[사용자 로그인] → Auth 인증
  ↓
[관리자 페이지 접근]
  ↓
[JwtAuthGuard] 인증 토큰 확인
  ↓
[AdminGuard] role === 'ADMIN' 확인
  ↓ (통과)
[관리자 기능 접근]
```

---

#### 👥 Users (사용자 관리)
**관계**: 조회 및 관리 대상 관계
- Admin는 Users를 **전체 사용자 관리 관점**에서 조회 및 수정
- **비즈니스 의미**:
  - 전체 사용자 목록 조회 (일반 사용자는 불가)
  - 역할별 필터링 (USER/ADMIN)
  - 사용자 역할 변경 (권한 부여/회수)
  - 사용자 통계 집계

**비즈니스 흐름**
```
[관리자] GET /api/admin/users?role=USER&page=1
  ↓
[Users] 전체 사용자 조회 + 비밀번호 제거
  ↓
[페이지네이션] 10명씩 분할
  ↓
[응답] 사용자 목록 + 페이지 정보

---

[관리자] PATCH /api/admin/users/:id/role
  ↓
[Users] 특정 사용자 역할 변경 (USER → ADMIN)
  ↓
[권한 부여] 관리자 권한 획득
```

**제공하는 관리 기능**
- 사용자 목록 조회 (페이지네이션)
- 역할별 필터링
- 역할 변경 (USER ↔ ADMIN)
- 사용자 통계 (역할별 개수)

---

#### 📅 Reservations (예약 관리)
**관계**: 전체 예약 모니터링 관계
- Admin는 Reservations를 **시스템 전체 예약 현황**  관점에서 조회
- **비즈니스 의미**:
  - 모든 사용자의 예약 조회 (소유권 무관)
  - 다양한 필터링 (상태, 방, 사용자, 날짜)
  - 예약 승인 (PENDING → CONFIRMED)
  - 예약 통계 (상태별, 방별, 일별)

**비즈니스 흐름**
```
[관리자 Dashboard] GET /api/admin/reservations?status=PENDING
  ↓
[Reservations] 전체 PENDING 예약 조회
  ↓
[응답] 승인 대기 중인 예약 목록 (user, room 정보 포함)

---

[관리자] 예약 승인 처리
  ↓
[Reservations] POST /api/reservations/:id/confirm
  ↓
[상태 전환] PENDING → CONFIRMED
  ↓
[Notifications] 사용자에게 확정 알림
```

**제공하는 관리 기능**
- 전체 예약 목록 조회 (페이지네이션)
- 상태별 필터링 (PENDING, CONFIRMED, CANCELLED, COMPLETED, NO_SHOW)
- 방별/사용자별 필터링
- 날짜 범위 필터링
- 예약 통계 (상태별 개수, 방별 TOP 5, 일별 추이)

---

#### 🏢 Rooms (회의실 관리)
**관계**: 전체 방 현황 조회 관계
- Admin는 Rooms를 **시설 규모 및 이용률** 관점에서 조회
- **비즈니스 의미**:
  - 전체 방 개수 집계
  - 방별 예약 통계 (이용률 계산)
  - 인기 방 순위 (TOP 5)
  - 방 추가/제거 의사결정 지원

**비즈니스 흐름**
```
[Admin Dashboard] GET /api/admin/statistics
  ↓
[Rooms] 전체 방 개수 조회
  ↓
[Reservations] 방별 예약 개수 집계
  ↓
[통계] 방 이용률 계산
  ├─ 대회의실: 80% (150건 / 180일)
  ├─ 소회의실 A: 60% (120건 / 180일)
  └─ 소회의실 B: 40% (80건 / 180일)
  ↓
[의사결정] 소회의실 B 제거 또는 용도 변경 검토
```

**제공하는 통계**
- 전체 방 개수
- 방별 예약 횟수 TOP 5
- 방별 이용률

---

#### 🚪 Access (출입 제어)
**관계**: 출입 현황 모니터링 관계
- Admin는 Access를 **출입 이력 및 노쇼 패턴** 관점에서 조회
- **비즈니스 의미**:
  - 전체 출입 기록 조회
  - 사용자별 출입 패턴 분석
  - 노쇼 사용자 식별 (입장 기록 없는 예약)
  - 방별 실제 사용 통계

**비즈니스 흐름**
```
[관리자] 노쇼 사용자 분석
  ↓
[Reservations] 상태 = NO_SHOW인 예약 조회
  ↓
[Access] 입장 기록 없는 예약 확인 (isUsed: false)
  ↓
[집계] 사용자별 노쇼 횟수
  ├─ 홍길동: 5회 (15%)
  ├─ 김철수: 3회 (10%)
  └─ 이영희: 1회 (3%)
  ↓
[조치] 반복 노쇼 사용자 경고 또는 제재
```

**제공하는 통계**
- 전체 출입 횟수
- 방별 실제 이용률
- 사용자별 노쇼율
- 시간대별 출입 분포

---

#### 📢 Notifications (알림)
**관계**: 시스템 공지 발송 관계 (TODO)
- Admin는 Notifications를 통해 **전체 사용자에게 공지** 발송
- **비즈니스 의미** (미구현):
  - 시스템 점검 공지
  - 정책 변경 안내
  - 긴급 알림 발송
  - 사용자별 선택 알림

**향후 시나리오 (TODO)**
```
[관리자] 시스템 점검 공지 작성
  ↓
[Admin] POST /api/admin/notifications/broadcast
  ├─ 제목: "시스템 점검 안내"
  ├─ 내용: "2025-10-20 02:00 ~ 04:00 점검 예정"
  └─ 대상: 전체 사용자
  ↓
[Notifications] 전체 사용자에게 WebSocket 알림
  ↓
[사용자들] 실시간 알림 수신
```

---

#### 🚀 Cache (성능 최적화)
**관계**: 통계 성능 향상 관계
- Admin는 Cache를 통해 **복잡한 통계 쿼리 성능**을 최적화
- **비즈니스 의미**:
  - 통계 조회는 복잡한 집계 쿼리 (7개 쿼리, ~180ms)
  - 실시간성 불필요 (5분 지연 허용)
  - 관리자 대시보드 빠른 응답

**캐싱 전략**
```
[관리자] GET /api/admin/statistics
  ↓
[Cache] 캐시 확인 (CACHE_KEYS.STATISTICS)
  ├─ HIT → 캐시 반환 (~5ms)
  └─ MISS → DB 쿼리 실행
      ├─ 사용자 통계 (COUNT + GROUP BY)
      ├─ 예약 통계 (COUNT + GROUP BY)
      ├─ 방별 TOP 5 (JOIN + GROUP BY + ORDER BY)
      ├─ 일별 추이 (DATE + GROUP BY)
      └─ 당월 통계 (CASE WHEN + SUM)
      ↓ (~180ms)
      [Cache] 5분 TTL로 저장
      ↓
      [응답] 통계 결과
```

**캐싱 효과**
- 성능 향상: 약 36배 (180ms → 5ms)
- DB 부하 감소
- 사용자 경험 향상

---

### 데이터 관점의 관계

| 도메인 | 관계 타입 | 비즈니스 의미 | FK |
|--------|----------|--------------|-----|
| **Users** | 관리 대상 | 전체 사용자 조회 및 역할 변경 | - |
| **Reservations** | 집계 대상 | 전체 예약 조회 및 통계 | - |
| **Rooms** | 집계 대상 | 전체 방 개수 및 이용률 | - |
| **Access** | 집계 대상 | 출입 기록 및 노쇼 패턴 | - |
| **Auth** | 횡단 관심사 | ADMIN 권한 검증 | - |
| **Cache** | 성능 관계 | 통계 쿼리 캐싱 | - |
| **Notifications** | 이벤트 관계 | 시스템 공지 발송 (TODO) | - |

---

### 비즈니스 프로세스에서의 역할

#### 1. 사용자 관리 프로세스
```
[관리자 로그인] → Auth (ADMIN 권한)
  ↓
[사용자 목록 조회] GET /api/admin/users?page=1&limit=10
  ↓
[Users] 전체 사용자 조회 (비밀번호 제외)
  ↓
[역할 변경] PATCH /api/admin/users/:id/role
  ├─ USER → ADMIN (관리자 권한 부여)
  └─ ADMIN → USER (관리자 권한 회수)
  ↓
[권한 적용] 즉시 적용 (다음 로그인부터)
```

#### 2. 예약 관리 프로세스
```
[관리자 Dashboard]
  ↓
[전체 예약 조회] GET /api/admin/reservations?status=PENDING
  ├─ 승인 대기: 10건
  ├─ 확정됨: 50건
  ├─ 취소됨: 5건
  └─ 노쇼: 2건
  ↓
[예약 승인] POST /api/reservations/:id/confirm
  ↓
[상태 전환] PENDING → CONFIRMED
  ↓
[Notifications] 사용자에게 확정 알림
```

#### 3. 통계 조회 프로세스
```
[관리자 Dashboard] GET /api/admin/statistics
  ↓
[Cache] 캐시 확인 (5분 TTL)
  ├─ HIT → 캐시 반환 (~5ms)
  └─ MISS → 통계 계산
      ├─ [Users] 전체 사용자 수, 역할별 통계
      ├─ [Rooms] 전체 방 수
      ├─ [Reservations] 전체 예약 수, 상태별 통계
      ├─ [Reservations + Rooms] 방별 TOP 5
      ├─ [Reservations] 최근 7일 일별 추이
      └─ [Reservations] 당월 통계
      ↓
      [Cache] 저장 (5분)
      ↓
      [Dashboard] 통계 표시
        ├─ 전체 현황 (사용자, 방, 예약)
        ├─ 트렌드 차트 (일별 예약 추이)
        ├─ 인기 방 순위 (TOP 5)
        └─ 상태별 분포 (파이 차트)
```

#### 4. 노쇼 사용자 관리 프로세스
```
[관리자] 노쇼 패턴 분석
  ↓
[Reservations] status = NO_SHOW 조회
  ↓
[집계] 사용자별 노쇼 횟수 및 비율
  ├─ 사용자 A: 5회 / 30회 예약 = 16.7%
  ├─ 사용자 B: 3회 / 20회 예약 = 15.0%
  └─ 사용자 C: 1회 / 15회 예약 = 6.7%
  ↓
[판단] 15% 이상 노쇼 사용자 조치
  ├─ 경고 메시지 발송 (Notifications)
  ├─ 예약 제한 (1주일 또는 1개월)
  └─ 또는 역할 변경 (예약 불가 그룹)
```

---

### 핵심 비즈니스 규칙

1. **접근 권한**
   - ADMIN 역할만 모든 관리 API 접근 가능
   - 이중 가드 적용: JWT 인증 + ADMIN 권한
   - 일반 USER는 403 Forbidden

2. **페이지네이션**
   - 기본값: page=1, limit=10
   - 대량 데이터 조회 시 필수
   - 메모리 절약 및 응답 속도 향상

3. **필터링**
   - 사용자: 역할별 (USER/ADMIN)
   - 예약: 상태/방/사용자/날짜별
   - 유연한 조합 가능

4. **통계 캐싱**
   - 복잡한 집계 쿼리 (7개, ~180ms)
   - Redis 캐싱 (5분 TTL)
   - 성능 향상: 약 36배

5. **데이터 보안**
   - 사용자 조회 시 비밀번호 제거
   - Relations 조회 시에도 비밀번호 제외
   - 민감 정보 노출 방지

6. **역할 변경**
   - USER ↔ ADMIN 변경 가능
   - 즉시 적용 (다음 로그인부터)
   - 권한 부여/회수 추적 필요 (감사 로그)

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
