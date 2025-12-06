# 📅 Reservations 도메인 (예약 관리)

## 📋 목차
- [개요](#개요)
- [도메인 간 관계](#도메인-간-관계)
- [핵심 기능](#핵심-기능)
- [비즈니스 로직](#비즈니스-로직)
- [API 엔드포인트](#api-엔드포인트)
- [예약 상태 전환](#예약-상태-전환)
- [보안 및 권한](#보안-및-권한)
- [코드 위치](#코드-위치)
- [데이터 구조](#데이터-구조)

---

## 개요

Reservations 도메인은 회의실 예약의 핵심 비즈니스 로직을 담당하는 모듈입니다.

### 주요 책임
- 예약 생성 및 검증 (7단계 검증 프로세스)
- 예약 조회 (개인별, 방별)
- 예약 수정 및 취소 (시간 제약)
- 예약 충돌 검사
- 운영 시간 검증
- 예약 상태 관리

---

## 도메인 간 연관 관계

### 역할
**"방 예약의 핵심 비즈니스 프로세스 관리"**

Reservations 도메인은 회의실 예약의 전체 생명주기를 관리하며, 사용자의 예약 요청부터 확정, 변경, 취소, 완료까지의 모든 비즈니스 로직을 담당합니다.

---

### 비즈니스 연관 관계

#### 📊 Auth (인증/권한)
**관계**: 보안 및 소유권 제어
- Auth는 Reservations에게 **사용자 식별 및 접근 제어**를 제공
- **비즈니스 의미**:
  - 누가 예약을 생성했는지 추적 (소유권)
  - 본인의 예약만 조회/수정/취소 가능 (프라이버시 보호)
  - 관리자는 모든 예약 확정 권한
- **데이터 관계**: `Reservation.userId` → `User.id` (FK)
- **권한 구분**:
  - 일반 사용자: 자신의 예약만 CRUD
  - 관리자: 예약 확정, 전체 예약 조회

**비즈니스 흐름**
```
[사용자 로그인] → Auth 인증
  ↓
[예약 생성] → userId 자동 설정 (본인 소유)
  ↓
[예약 조회/수정] → userId 일치 확인 (본인만)
```

---

#### 🏢 Rooms (회의실 관리)
**관계**: 자원 소비 관계 (N:1)
- Reservations는 Rooms의 **시간대별 자원을 점유**
- **비즈니스 의미**:
  - 여러 예약이 하나의 방을 시간대별로 나눠 사용
  - 방의 속성(수용인원, 운영시간)이 예약 가능 여부 결정
  - 방이 비활성화되면 해당 방의 예약 생성 불가
- **데이터 관계**: `Reservation.roomId` → `Room.id` (FK)

**비즈니스 흐름**
```
[예약 요청]
  ↓
[Rooms] 방 정보 조회 (capacity, operatingHours)
  ↓
[Reservations] 7단계 검증 프로세스
  ├─ 방 존재 여부
  ├─ 수용 인원 검증 (attendees <= room.capacity)
  ├─ 운영 시간 검증 (room.operatingHours)
  ├─ 운영 요일 검증 (weekdays)
  └─ 예약 충돌 검사 (같은 방의 시간대 오버랩)
  ↓ (검증 통과)
[예약 생성] → PENDING 상태
```

**Rooms로부터 받는 제약 조건**
- 수용 인원 제한: `attendees <= room.capacity`
- 운영 시간 제한: 예약 시간이 `operatingHours.startTime ~ endTime` 내
- 운영 요일 제한: 예약 날짜의 요일이 `operatingHours.weekdays`에 포함
- 활성 상태 제한: `room.isActive === true`인 방만 예약 가능

---

#### 🚪 Access (출입 제어)
**관계**: 후속 프로세스 제공 관계 (1:N)
- Reservations는 Access에게 **출입 권한 생성의 근거**를 제공
- **비즈니스 의미**:
  - 확정된 예약(`CONFIRMED`)에 대해서만 출입 토큰 생성 가능
  - 하나의 예약당 여러 번 입장 가능 (토큰 재생성)
  - 예약 취소 시 출입 토큰도 무효화 필요
- **데이터 관계**: `RoomAccess.reservationId` → `Reservation.id` (FK)

**비즈니스 흐름**
```
[예약 확정] PENDING → CONFIRMED
  ↓
[Access] 출입 토큰 생성 가능 (QR/PIN)
  ↓
[사용자] 예약 시작 10분 전부터 토큰 발급 가능
  ↓
[입장 기록] RoomAccess 테이블에 기록
  ↓
[Scheduler] 입장 기록 있으면 COMPLETED, 없으면 NO_SHOW
```

**Access가 사용하는 예약 정보**
- 예약 시간대: 토큰 유효 기간 계산 (시작 10분 전 ~ 종료 30분 후)
- 예약 상태: `CONFIRMED` 상태만 토큰 발급
- 방 ID: 어느 방에 대한 출입 권한인지

---

#### 📢 Notifications (알림)
**관계**: 이벤트 발행 관계
- Reservations는 Notifications에게 **예약 상태 변경 이벤트**를 제공
- **비즈니스 의미**:
  - 예약 생성/확정/취소 시 사용자에게 알림
  - 해당 방을 구독 중인 다른 사용자에게도 가용성 변경 알림
  - 예약 시작 전 리마인더 알림

**알림 시나리오**
```
[예약 생성] → PENDING 상태
  ↓
[Notifications] "예약이 신청되었습니다" 알림
  ↓
[관리자 확정] → CONFIRMED 상태
  ↓
[Notifications] "예약이 확정되었습니다" 알림 + QR 코드 안내
  ↓
[예약 취소]
  ↓
[Notifications] room:${roomId} 채널에 가용성 변경 이벤트
```

**발행하는 이벤트 타입**
- `RESERVATION_CREATED`: 예약 생성
- `RESERVATION_CONFIRMED`: 예약 확정
- `RESERVATION_CANCELLED`: 예약 취소
- `RESERVATION_REMINDER`: 예약 시작 전 알림

---

#### 🔧 Admin (관리)
**관계**: 관리 및 통계 대상 관계
- Admin는 Reservations를 **전체 예약 현황 관점**에서 조회
- **비즈니스 의미**:
  - 전체 예약 현황 모니터링
  - 상태별 예약 통계 (PENDING, CONFIRMED, CANCELLED, NO_SHOW)
  - 사용자별/방별 예약 이력 조회
  - 예약 승인/거부 처리

**통계 활용**
```
[Admin Dashboard]
  ↓
[Reservations] 상태별 예약 개수 집계
  ├─ PENDING: 5건 (승인 대기)
  ├─ CONFIRMED: 20건 (진행 예정)
  ├─ CANCELLED: 3건 (취소됨)
  └─ NO_SHOW: 2건 (노쇼)
  ↓
[통계] 예약 현황 대시보드 표시
```

**Admin이 수행하는 예약 관리**
- 예약 확정: `POST /api/reservations/:id/confirm`
- 전체 예약 조회: 날짜/상태/사용자/방 필터링
- 노쇼 패턴 분석
- 방 이용률 계산

---

#### ⏰ Scheduler (자동 처리)
**관계**: 상태 전환 자동화 관계
- Scheduler는 Reservations의 **시간 기반 상태를 자동 전환**
- **비즈니스 의미**:
  - 예약 시간 경과 후 자동으로 상태 변경
  - 입장 기록 기반으로 COMPLETED/NO_SHOW 판정
  - 사용자 개입 없이 예약 생명주기 완성

**자동 처리 시나리오**
```
[예약 시작 30분 경과]
  ↓
[Scheduler] 매 10분 체크
  ↓
[입장 기록 확인] Access 테이블 조회
  ├─ 입장 기록 있음 → 대기 (예약 계속 진행)
  └─ 입장 기록 없음 → NO_SHOW 처리
  ↓
[예약 종료 시간 경과]
  ↓
[Scheduler] CONFIRMED → COMPLETED 전환
```

**자동 전환 규칙**
- `CONFIRMED` → `NO_SHOW`: 시작 30분 경과 + 입장 기록 없음
- `CONFIRMED` → `COMPLETED`: 종료 시간 경과

---

### 데이터 관점의 관계

| 도메인 | 관계 타입 | 비즈니스 의미 | FK |
|--------|----------|--------------|-----|
| **Users** | N:1 | 사용자는 여러 예약 생성 가능 | `Reservation.userId` |
| **Rooms** | N:1 | 하나의 방은 여러 예약 보유 | `Reservation.roomId` |
| **Access** | 1:N | 하나의 예약은 여러 출입 기록 | `RoomAccess.reservationId` |
| **Auth** | 횡단 관심사 | 모든 예약 작업에 인증 필요 | - |
| **Notifications** | 이벤트 관계 | 상태 변경 시 알림 발행 | - |
| **Admin** | 집계 관계 | 예약 현황 통계 집계 | - |
| **Scheduler** | 자동화 관계 | 시간 기반 상태 전환 | - |

---

### 비즈니스 프로세스에서의 역할

#### 1. 예약 생성 프로세스
```
[사용자 로그인] → Auth
  ↓
[방 선택] → Rooms (가용 방 조회)
  ↓
[예약 요청] → Reservations
  ├─ 7단계 검증 (방 존재, 시간 규칙, 수용인원, 운영시간, 충돌)
  ├─ 예약 생성 (PENDING 상태)
  └─ Notifications (생성 알림)
  ↓
[관리자 확정] → Admin (선택적)
  ↓ PENDING → CONFIRMED
[확정 알림] → Notifications
```

#### 2. 예약 취소 프로세스
```
[사용자] → 예약 취소 요청 (시작 30분 전까지)
  ↓
[Reservations] 취소 가능 여부 검증
  ├─ 본인 예약인지 확인
  ├─ 시간 제약 확인
  └─ CANCELLED 상태로 변경
  ↓
[Notifications] 취소 알림 + room:${roomId} 가용성 변경 이벤트
  ↓
[해당 방 구독자들] 알림 수신 (방 시간대가 비었음)
```

#### 3. 예약 완료 프로세스
```
[예약 시작]
  ↓
[Access] 출입 토큰 발급 (시작 10분 전부터)
  ↓
[사용자 입장] → RoomAccess 기록 생성
  ↓
[예약 종료 시간 경과]
  ↓
[Scheduler] 10분마다 체크
  ├─ 입장 기록 있음 → COMPLETED
  └─ 입장 기록 없음 → NO_SHOW
  ↓
[통계 집계] → Admin Dashboard
```

---

### 핵심 비즈니스 규칙

1. **예약 검증 (7단계)**
   - 방 존재 → 미래 시간 → 시작<종료 → 최소 30분 → 최대 8시간 → 수용인원 → 운영시간 → 충돌 검사

2. **시간 제약**
   - 최소 예약 시간: 30분
   - 최대 예약 시간: 8시간
   - 예약 변경 제한: 시작 1시간 전까지
   - 예약 취소 제한: 시작 30분 전까지
   - 자정 넘어가는 예약 불가 (같은 날짜만)

3. **상태 전환**
   - PENDING → CONFIRMED (관리자 확정)
   - CONFIRMED → CANCELLED (사용자/관리자, 30분 전까지)
   - CONFIRMED → COMPLETED (자동, 종료 시간 경과)
   - CONFIRMED → NO_SHOW (자동, 입장 기록 없음)

4. **소유권 제어**
   - 예약 조회/수정/취소는 본인만 가능
   - 예외: 관리자는 모든 예약 접근 가능
   - 방별 예약 현황 조회는 CONFIRMED 상태만 공개 (프라이버시)

5. **충돌 방지**
   - 같은 방의 같은 시간대에 PENDING/CONFIRMED 예약 존재 시 불가
   - 예약 수정 시 자신의 예약은 충돌 검사에서 제외

---

## 핵심 기능

### 1. 예약 신청 (Create Reservation)
**위치**: `src/reservations/reservations.controller.ts:50`, `src/reservations/reservations.service.ts:24`

```typescript
POST /api/reservations
```

**권한**: 인증된 사용자

**기능**
- 새로운 예약 신청
- **7단계 검증 프로세스** 수행
- 예약 충돌 검사

#### 7단계 검증 프로세스

**1단계: 방 존재 여부 확인**
```typescript
const room = await this.roomsService.findOne(roomId);
// NotFoundException 발생 가능
```

**2단계: 예약 시작 시간 검증**
```typescript
if (start <= now) {
  throw new BadRequestException('Reservation start time must be in the future');
}
```
- 과거 시간 예약 불가

**3단계: 시작/종료 시간 검증**
```typescript
if (start >= end) {
  throw new BadRequestException('Start time must be before end time');
}
```

**4단계: 최소 예약 시간 검증 (30분)**
```typescript
const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
if (durationMinutes < 30) {
  throw new BadRequestException('Minimum reservation duration is 30 minutes');
}
```

**5단계: 최대 예약 시간 검증 (8시간)**
```typescript
if (durationMinutes > 480) {
  throw new BadRequestException('Maximum reservation duration is 8 hours');
}
```

**6단계: 수용 인원 검증**
```typescript
if (attendees > room.capacity) {
  throw new BadRequestException(
    `Attendees count (${attendees}) exceeds room capacity (${room.capacity})`
  );
}
```

**7단계: 운영 시간 검증**
```typescript
this.validateOperatingHours(start, end, room.operatingHours);
```
- 요일 검증 (운영 요일인지 확인)
- 시간대 검증 (운영 시간 내인지 확인)
- 같은 날짜인지 확인 (자정 넘어가는 예약 불가)

**8단계: 예약 충돌 검사**
```typescript
await this.checkReservationConflict(roomId, start, end);
```
- 같은 방의 PENDING, CONFIRMED 예약과 시간 오버랩 검사

**예약 생성**
```typescript
const reservation = this.reservationRepository.create({
  ...createReservationDto,
  userId,
  startTime: start,
  endTime: end,
  status: ReservationStatus.PENDING // 초기 상태
});
```

---

### 2. 내 예약 목록 조회 (Get My Reservations)
**위치**: `src/reservations/reservations.controller.ts:64`, `src/reservations/reservations.service.ts:87`

```typescript
GET /api/reservations
```

**권한**: 인증된 사용자 (자신의 예약만 조회)

**기능**
- 로그인한 사용자의 모든 예약 조회
- Room, User 정보 포함 (relations)
- 최신 예약 먼저 정렬 (startTime DESC)

```typescript
return await this.reservationRepository.find({
  where: { userId },
  relations: ['room', 'user'],
  order: { startTime: 'DESC' }
});
```

---

### 3. 예약 상세 조회 (Get Reservation Detail)
**위치**: `src/reservations/reservations.controller.ts:102`, `src/reservations/reservations.service.ts:95`

```typescript
GET /api/reservations/:id
```

**권한**: 인증된 사용자 (본인 예약만 조회 가능)

**기능**
- 특정 예약 상세 정보 조회
- 권한 검증 (본인 예약만)

**권한 검증**
```typescript
if (reservation.userId !== userId) {
  throw new ForbiddenException(
    'You do not have permission to view this reservation'
  );
}
```

---

### 4. 방별 예약 현황 조회 (Get Reservations by Room)
**위치**: `src/reservations/reservations.controller.ts:81`, `src/reservations/reservations.service.ts:115`

```typescript
GET /api/reservations/room/:roomId
```

**권한**: 인증된 사용자

**기능**
- 특정 방의 모든 예약 조회
- **CONFIRMED 상태만 조회** (확정된 예약만)
- 시작 시간 오름차순 정렬

```typescript
return await this.reservationRepository.find({
  where: {
    roomId,
    status: ReservationStatus.CONFIRMED
  },
  relations: ['user'],
  order: { startTime: 'ASC' }
});
```

**왜 CONFIRMED만?**
- 다른 사용자의 PENDING 예약은 공개하지 않음 (프라이버시)
- 확정된 예약만 실제 사용 중으로 간주

---

### 5. 예약 변경 (Update Reservation)
**위치**: `src/reservations/reservations.controller.ts:128`, `src/reservations/reservations.service.ts:129`

```typescript
PATCH /api/reservations/:id
```

**권한**: 인증된 사용자 (본인 예약만)

**시간 제약**: **예약 시작 1시간 전까지만 변경 가능**

**기능**
- 예약 정보 수정 (시간, 제목, 목적, 참석자)
- 상태 검증 (CANCELLED, COMPLETED 불가)
- 시간 변경 시 재검증

**변경 불가 조건**
```typescript
// 1. 취소된 예약
if (reservation.status === ReservationStatus.CANCELLED) {
  throw new BadRequestException('Cannot update a cancelled reservation');
}

// 2. 완료된 예약
if (reservation.status === ReservationStatus.COMPLETED) {
  throw new BadRequestException('Cannot update a completed reservation');
}

// 3. 시작 1시간 전
const oneHourBeforeStart = new Date(reservation.startTime);
oneHourBeforeStart.setHours(oneHourBeforeStart.getHours() - 1);

if (new Date() > oneHourBeforeStart) {
  throw new BadRequestException(
    'Cannot update reservation within 1 hour of start time'
  );
}
```

**시간 변경 시 재검증**
- 시작/종료 시간 유효성
- 최소/최대 예약 시간 (30분 ~ 8시간)
- 운영 시간 검증
- **충돌 검사 (자신의 예약 제외)**

```typescript
await this.checkReservationConflict(
  reservation.roomId,
  newStart,
  newEnd,
  id // 자신의 예약 ID 제외
);
```

---

### 6. 예약 취소 (Cancel Reservation)
**위치**: `src/reservations/reservations.controller.ts:159`, `src/reservations/reservations.service.ts:216`

```typescript
DELETE /api/reservations/:id
```

**권한**: 인증된 사용자 (본인 예약만)

**시간 제약**: **예약 시작 30분 전까지만 취소 가능**

**기능**
- 예약 상태를 CANCELLED로 변경
- 취소 사유 기록 (필수)

**취소 불가 조건**
```typescript
// 1. 이미 취소된 예약
if (reservation.status === ReservationStatus.CANCELLED) {
  throw new BadRequestException('Reservation is already cancelled');
}

// 2. 시작 30분 전
const thirtyMinutesBeforeStart = new Date(reservation.startTime);
thirtyMinutesBeforeStart.setMinutes(
  thirtyMinutesBeforeStart.getMinutes() - 30
);

if (new Date() > thirtyMinutesBeforeStart) {
  throw new BadRequestException(
    'Cannot cancel reservation within 30 minutes of start time'
  );
}
```

**취소 처리**
```typescript
reservation.status = ReservationStatus.CANCELLED;
reservation.cancellationReason = cancelDto.cancellationReason;
await this.reservationRepository.save(reservation);
```

---

### 7. 예약 확정 (Confirm Reservation)
**위치**: `src/reservations/reservations.controller.ts:184`, `src/reservations/reservations.service.ts:246`

```typescript
POST /api/reservations/:id/confirm
```

**권한**: 관리자 전용 (`@Roles(UserRole.ADMIN)`)

**기능**
- PENDING 상태의 예약을 CONFIRMED로 변경
- 관리자 승인 필요한 경우 사용

**확정 조건**
```typescript
if (reservation.status !== ReservationStatus.PENDING) {
  throw new BadRequestException(
    'Only pending reservations can be confirmed'
  );
}

reservation.status = ReservationStatus.CONFIRMED;
```

---

## 비즈니스 로직

### 1. 운영 시간 검증
**위치**: `src/reservations/reservations.service.ts:265`

```typescript
private validateOperatingHours(
  start: Date,
  end: Date,
  operatingHours: any
): void
```

**검증 항목**

**a. 같은 날짜인지 확인**
```typescript
const startWeekday = start.getDay();
const endWeekday = end.getDay();

if (startWeekday !== endWeekday) {
  throw new BadRequestException(
    'Reservation cannot span across multiple days'
  );
}
```

**b. 운영 요일인지 확인**
```typescript
if (!operatingHours.weekdays.includes(startWeekday)) {
  throw new BadRequestException(
    'Room is not operating on the selected day'
  );
}
```

**c. 운영 시간 내인지 확인**
```typescript
// 시간을 분 단위로 변환하여 비교
const startTimeMinutes = startHour * 60 + startMinute;
const opStartTimeMinutes = opStartHour * 60 + opStartMinute;

if (startTimeMinutes < opStartTimeMinutes || endTimeMinutes > opEndTimeMinutes) {
  throw new BadRequestException(
    `Reservation time must be within operating hours (${operatingHours.startTime} - ${operatingHours.endTime})`
  );
}
```

---

### 2. 예약 충돌 검사
**위치**: `src/reservations/reservations.service.ts:315`

```typescript
private async checkReservationConflict(
  roomId: string,
  startTime: Date,
  endTime: Date,
  excludeReservationId?: string
): Promise<void>
```

**충돌 조건**
- 같은 방 (`roomId`)
- 활성 상태 (`PENDING` 또는 `CONFIRMED`)
- 시간 오버랩 (아래 수식 참고)

**시간 오버랩 검사 수식**
```typescript
(reservation.startTime < endTime AND reservation.endTime > startTime)
```

**예시**
```
기존 예약: 10:00 ~ 12:00
신규 예약: 11:00 ~ 13:00

오버랩 검사:
  기존.startTime (10:00) < 신규.endTime (13:00) ✅
  AND
  기존.endTime (12:00) > 신규.startTime (11:00) ✅

→ 충돌 발생!
```

**Query Builder**
```typescript
const queryBuilder = this.reservationRepository
  .createQueryBuilder('reservation')
  .where('reservation.roomId = :roomId', { roomId })
  .andWhere('reservation.status IN (:...statuses)', {
    statuses: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED]
  })
  .andWhere(
    '(reservation.startTime < :endTime AND reservation.endTime > :startTime)',
    { startTime, endTime }
  );

// 예약 수정 시 자신의 예약 제외
if (excludeReservationId) {
  queryBuilder.andWhere('reservation.id != :excludeReservationId', {
    excludeReservationId
  });
}

const conflictingReservation = await queryBuilder.getOne();

if (conflictingReservation) {
  throw new ConflictException(
    'The selected time slot conflicts with an existing reservation'
  );
}
```

---

## API 엔드포인트

| 메서드 | 경로 | 권한 | 설명 |
|--------|------|------|------|
| POST | `/api/reservations` | 🔓 인증 필요 | 예약 신청 |
| GET | `/api/reservations` | 🔓 인증 필요 | 내 예약 목록 |
| GET | `/api/reservations/:id` | 🔓 본인만 | 예약 상세 조회 |
| GET | `/api/reservations/room/:roomId` | 🔓 인증 필요 | 방별 예약 현황 |
| PATCH | `/api/reservations/:id` | 🔓 본인만 | 예약 변경 (1시간 전까지) |
| DELETE | `/api/reservations/:id` | 🔓 본인만 | 예약 취소 (30분 전까지) |
| POST | `/api/reservations/:id/confirm` | 🔑 ADMIN | 예약 확정 |

---

## 예약 상태 전환

### ReservationStatus Enum

```typescript
enum ReservationStatus {
  PENDING = 'PENDING',       // 대기 중
  CONFIRMED = 'CONFIRMED',   // 확정
  CANCELLED = 'CANCELLED',   // 취소
  COMPLETED = 'COMPLETED',   // 완료
  NO_SHOW = 'NO_SHOW'        // 노쇼
}
```

### 상태 전환 다이어그램

```
[사용자 신청]
      ↓
  PENDING ──────────────────→ CANCELLED (사용자/관리자 취소)
      ↓                              ↑
[관리자 확정]                         │
      ↓                              │
  CONFIRMED ────────────────→ (30분 전까지)
      ↓
[시간 경과 / 자동 처리]
      ↓
  COMPLETED (정상 사용 완료)
      or
  NO_SHOW (입장 기록 없음)
```

### 상태 전환 규칙

| 현재 상태 | 가능한 전환 | 실행자 |
|----------|------------|--------|
| PENDING | → CONFIRMED | 관리자 (confirm API) |
| PENDING | → CANCELLED | 사용자/관리자 (cancel API) |
| CONFIRMED | → CANCELLED | 사용자/관리자 (30분 전까지) |
| CONFIRMED | → COMPLETED | 시스템 (Scheduler) |
| CONFIRMED | → NO_SHOW | 시스템 (Scheduler, 입장 기록 없음) |
| CANCELLED | → (불가) | - |
| COMPLETED | → (불가) | - |
| NO_SHOW | → (불가) | - |

### 자동 상태 전환 (Scheduler)

**위치**: `src/scheduler/scheduler.service.ts`

**1. CONFIRMED → COMPLETED**
- 조건: 예약 종료 시간 경과 + 입장 기록 있음
- 주기: 매 10분

**2. CONFIRMED → NO_SHOW**
- 조건: 예약 시작 30분 경과 + 입장 기록 없음
- 주기: 매 10분

---

## 보안 및 권한

### 권한 검증

#### 1. 본인 예약 확인
```typescript
if (reservation.userId !== userId) {
  throw new ForbiddenException(
    'You do not have permission to view/modify this reservation'
  );
}
```

#### 2. 관리자 전용 (예약 확정)
```typescript
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
```

### 권한 매트릭스

| 작업 | 본인 | 타인 | ADMIN |
|------|------|------|-------|
| 예약 신청 | ✅ | - | ✅ |
| 내 예약 조회 | ✅ | ❌ | ✅ (via Admin API) |
| 예약 상세 조회 | ✅ | ❌ | ✅ |
| 방별 예약 현황 | ✅ (CONFIRMED만) | ✅ (CONFIRMED만) | ✅ |
| 예약 변경 | ✅ | ❌ | ✅ |
| 예약 취소 | ✅ | ❌ | ✅ |
| 예약 확정 | ❌ | ❌ | ✅ |

---

## 코드 위치

### 컨트롤러
- **경로**: `src/reservations/reservations.controller.ts`
- **라인 수**: 188줄
- **엔드포인트**: 7개

### 서비스
- **경로**: `src/reservations/reservations.service.ts`
- **라인 수**: 347줄
- **메서드**: 9개 (5개 public + 2개 private 검증 + 2개 private 헬퍼)

### 엔티티
- **경로**: `src/reservations/reservation.entity.ts`
- **라인 수**: 76줄

### DTO
- `src/reservations/dto/create-reservation.dto.ts` - 예약 생성
- `src/reservations/dto/update-reservation.dto.ts` - 예약 수정
- `src/reservations/dto/cancel-reservation.dto.ts` - 예약 취소

---

## 데이터 구조

### Reservation Entity

```typescript
{
  id: string;                      // UUID
  roomId: string;                  // 방 ID (FK)
  userId: string;                  // 사용자 ID (FK)
  title: string;                   // 예약 제목
  purpose: string;                 // 사용 목적
  startTime: Date;                 // 시작 시간 (timestamp)
  endTime: Date;                   // 종료 시간 (timestamp)
  attendees: number;               // 참석 인원
  status: ReservationStatus;       // 예약 상태
  cancellationReason?: string;     // 취소 사유 (nullable)
  createdAt: Date;                 // 생성 일시
  updatedAt: Date;                 // 수정 일시

  // Relations
  room: Room;                      // 방 정보 (ManyToOne)
  user: User;                      // 사용자 정보 (ManyToOne)
}
```

### 예약 생성 예시

```json
{
  "roomId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "프로젝트 킥오프 미팅",
  "purpose": "2025년 1분기 프로젝트 계획 수립",
  "startTime": "2025-10-15T10:00:00Z",
  "endTime": "2025-10-15T12:00:00Z",
  "attendees": 15
}
```

### 예약 취소 예시

```json
{
  "cancellationReason": "일정 변경으로 인한 취소"
}
```

---

## 비즈니스 규칙 요약

### 시간 제약

| 규칙 | 값 | 설명 |
|------|-----|------|
| 최소 예약 시간 | 30분 | 30분 미만 예약 불가 |
| 최대 예약 시간 | 8시간 | 8시간 초과 예약 불가 |
| 예약 변경 제한 | 시작 1시간 전 | 1시간 전부터 변경 불가 |
| 예약 취소 제한 | 시작 30분 전 | 30분 전부터 취소 불가 |
| 노쇼 판정 | 시작 30분 경과 | 입장 기록 없으면 NO_SHOW |

### 검증 순서

1. ✅ 방 존재 여부
2. ✅ 시작 시간 (미래)
3. ✅ 시작 < 종료
4. ✅ 최소 시간 (30분)
5. ✅ 최대 시간 (8시간)
6. ✅ 수용 인원
7. ✅ 운영 시간
8. ✅ 예약 충돌

---

## 주요 의존성

- `@nestjs/typeorm` - TypeORM 통합
- `typeorm` - ORM
- `RoomsService` - 방 정보 조회

---

## 테스트

### 단위 테스트
- **파일**: `src/reservations/reservations.service.spec.ts`
- **커버리지**: ReservationsService의 모든 메서드

### E2E 테스트
- **파일**: `test/reservations.e2e-spec.ts`
- **테스트 케이스**: 25개
- **커버리지**:
  - 예약 생성 (정상, 과거 시간, 시간 규칙, 충돌)
  - 예약 조회 (개인별, 방별, 상세)
  - 예약 수정 (시간 변경, 권한, 제약)
  - 예약 취소 (시간 제약, 권한)
  - 예약 확정 (관리자 권한)

---

## 성능 최적화

### 1. 인덱스 전략
```sql
-- 예약 충돌 검사 최적화
CREATE INDEX idx_reservations_room_time ON reservations (roomId, startTime, endTime);
CREATE INDEX idx_reservations_status ON reservations (status);

-- 사용자별 예약 조회 최적화
CREATE INDEX idx_reservations_user ON reservations (userId, startTime DESC);
```

### 2. 쿼리 최적화
- `createQueryBuilder` 사용 (동적 쿼리)
- `relations` 옵션으로 N+1 문제 방지
- 필요한 필드만 조회 (select 최적화)

### 3. 트랜잭션 (TODO)
- 예약 생성 + 알림 발송 (원자성 보장)
- 예약 취소 + 캐시 무효화

---

## 다음 개선 사항

1. **반복 예약**
   - 주간/월간 반복 예약 기능
   - 특정 요일 자동 예약

2. **예약 대기열**
   - 예약 불가 시 대기열 등록
   - 취소 발생 시 자동 확정

3. **예약 승인 워크플로우**
   - 부서장 승인 필요
   - 다단계 승인 프로세스

4. **예약 템플릿**
   - 자주 사용하는 예약 템플릿 저장
   - 원클릭 예약

5. **예약 공유**
   - 다른 사용자에게 예약 권한 위임
   - 참석자 관리 기능

6. **예약 통계**
   - 사용자별 예약 이력
   - 노쇼 패턴 분석
   - 방 이용률 통계

7. **스마트 추천**
   - AI 기반 최적 방 추천
   - 선호 시간대 분석
