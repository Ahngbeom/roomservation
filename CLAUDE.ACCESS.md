# 🔑 Access 도메인 (출입 관리)

## 📋 목차
- [개요](#개요)
- [도메인 간 관계](#도메인-간-관계)
- [핵심 기능](#핵심-기능)
- [토큰 생성 메커니즘](#토큰-생성-메커니즘)
- [API 엔드포인트](#api-엔드포인트)
- [보안 및 권한](#보안-및-권한)
- [코드 위치](#코드-위치)
- [데이터 구조](#데이터-구조)

---

## 개요

Access 도메인은 예약 기반 방 출입 관리를 담당하는 모듈입니다.

### 주요 책임
- 입장 토큰 생성 (QR 코드, PIN)
- 입장 토큰 검증 및 출입 승인
- 출입 기록 관리
- 방 실시간 사용 상태 조회
- 노쇼 방지 (입장 기록 추적)

---

## 도메인 간 연관 관계

### 역할
**"예약 기반 물리적 출입 권한 관리"**

Access 도메인은 확정된 예약을 기반으로 실제 방에 대한 출입 토큰을 생성하고, 입장 기록을 통해 예약 이행 여부를 추적하는 역할을 담당합니다.

---

### 비즈니스 연관 관계

#### 📊 Auth (인증/권한)
**관계**: 보안 및 소유권 검증
- Auth는 Access에게 **사용자 인증 및 토큰 생성 권한**을 제공
- **비즈니스 의미**:
  - 본인의 예약에 대해서만 출입 토큰 생성 가능
  - 토큰 검증은 모든 인증 사용자 가능 (출입 담당자)
  - 출입 기록 조회는 본인만 가능 (프라이버시)
- **데이터 관계**: `RoomAccess.userId` → `User.id` (FK)

**비즈니스 흐름**
```
[사용자 로그인] → Auth 인증
  ↓
[토큰 생성 요청] → userId로 예약 소유권 확인
  ↓
[토큰 발급] → 본인 예약만 가능
```

---

#### 📅 Reservations (예약 관리)
**관계**: 근거 제공 관계 (N:1)
- Access는 Reservations로부터 **출입 권한의 법적 근거**를 제공받음
- **비즈니스 의미**:
  - 예약 없이는 출입 토큰 생성 불가
  - 예약 상태(`CONFIRMED`)가 토큰 생성 가능 여부 결정
  - 예약 시간대가 토큰 유효 기간 결정
  - 하나의 예약당 여러 출입 토큰 생성 가능 (재발급)
- **데이터 관계**: `RoomAccess.reservationId` → `Reservation.id` (FK)

**비즈니스 흐름**
```
[예약 확정] PENDING → CONFIRMED
  ↓
[사용자] 토큰 생성 가능 시간 (시작 10분 전 ~ 시작 30분 후)
  ↓
[Access] 토큰 생성 (QR/PIN)
  ├─ 예약 상태 검증 (CONFIRMED만)
  ├─ 예약 시간대 검증 (10분 전 ~ 30분 후)
  └─ 토큰 만료 시간 설정 (시작 30분 후)
  ↓
[토큰 사용] → 입장 기록 생성 (isUsed: true, accessTime)
  ↓
[Scheduler] 입장 기록으로 예약 완료/노쇼 판정
```

**Reservations로부터 받는 제약 조건**
- 예약 상태 제한: `CONFIRMED` 상태만 토큰 생성
- 시간 제약: 예약 시작 10분 전 ~ 시작 30분 후만 생성
- 취소된 예약: 토큰 생성 불가
- 예약 소유자: 본인 예약만 토큰 생성

---

#### 🏢 Rooms (회의실 관리)
**관계**: 출입 대상 매핑 관계 (N:1)
- Access는 Rooms의 **물리적 공간에 대한 출입 권한**을 제공
- **비즈니스 의미**:
  - 토큰은 특정 방에 대한 출입 권한
  - 방의 위치 정보로 사용자가 올바른 방 찾기
  - 하나의 방은 여러 출입 기록 보유
- **데이터 관계**: `RoomAccess.roomId` → `Room.id` (FK)

**비즈니스 흐름**
```
[토큰 생성]
  ↓
[예약에서 roomId 추출]
  ↓
[RoomAccess 생성] → roomId 저장
  ↓
[사용자] 토큰으로 해당 방 찾아가기
  ↓
[토큰 검증] → 올바른 방에 입장했는지 확인
```

---

#### ⏰ Scheduler (자동 처리)
**관계**: 노쇼 판정 근거 제공
- Access의 입장 기록이 Scheduler의 **노쇼 판정 기준**이 됨
- **비즈니스 의미**:
  - 예약 시작 30분 경과 시 입장 기록 확인
  - 입장 기록 있음(`isUsed: true`) → `COMPLETED` 처리
  - 입장 기록 없음(`isUsed: false`) → `NO_SHOW` 처리
  - 예약 이행 여부 자동 판정

**자동 처리 시나리오**
```
[예약 시작 30분 경과]
  ↓
[Scheduler] 매 10분마다 체크
  ↓
[Access 테이블 조회] WHERE reservationId = ? AND isUsed = true
  ├─ 입장 기록 있음 (accessTime 존재)
  │   → 대기 (예약 계속 진행)
  └─ 입장 기록 없음
      → Reservations: NO_SHOW 처리
  ↓
[예약 종료 시간 경과]
  ↓
[Scheduler] CONFIRMED → COMPLETED
```

---

#### 📢 Notifications (알림)
**관계**: 이벤트 수신 관계
- Notifications는 Access에게 **토큰 생성 알림 및 리마인더**를 제공
- **비즈니스 의미**:
  - 토큰 생성 시 사용자에게 QR/PIN 전송
  - 예약 시작 전 토큰 생성 가능 시점 알림
  - 토큰 만료 임박 알림

**알림 시나리오**
```
[예약 시작 10분 전]
  ↓
[Notifications] "이제 입장 토큰을 생성할 수 있습니다" 알림
  ↓
[사용자] 토큰 생성
  ↓
[Notifications] "QR 코드가 생성되었습니다" 알림 + QR 이미지
  ↓
[토큰 만료 5분 전]
  ↓
[Notifications] "토큰이 곧 만료됩니다" 알림
```

---

#### 🔧 Admin (관리)
**관계**: 모니터링 및 통계 대상
- Admin는 Access를 **출입 현황 및 패턴 분석 관점**에서 조회
- **비즈니스 의미**:
  - 전체 출입 기록 모니터링
  - 방별 출입 통계
  - 사용자별 출입 패턴 분석
  - 노쇼 패턴 집계

**통계 활용**
```
[Admin Dashboard]
  ↓
[Access] 출입 기록 집계
  ├─ 오늘 출입 횟수: 45건
  ├─ 방별 이용률: A-301 (80%), B-201 (60%)
  ├─ 사용자별 노쇼율: 홍길동 (5%), 김철수 (15%)
  └─ 시간대별 출입 분포: 오전(60%), 오후(40%)
  ↓
[통계] 출입 현황 대시보드 표시
```

---

### 데이터 관점의 관계

| 도메인 | 관계 타입 | 비즈니스 의미 | FK |
|--------|----------|--------------|-----|
| **Reservations** | N:1 | 하나의 예약은 여러 출입 기록 | `RoomAccess.reservationId` |
| **Users** | N:1 | 사용자는 여러 출입 기록 보유 | `RoomAccess.userId` |
| **Rooms** | N:1 | 하나의 방은 여러 출입 기록 | `RoomAccess.roomId` |
| **Auth** | 횡단 관심사 | 모든 출입 작업에 인증 필요 | - |
| **Scheduler** | 참조 관계 | 입장 기록으로 노쇼 판정 | - |
| **Notifications** | 이벤트 관계 | 토큰 생성/만료 알림 | - |
| **Admin** | 집계 관계 | 출입 현황 통계 집계 | - |

---

### 비즈니스 프로세스에서의 역할

#### 1. 출입 토큰 생성 프로세스
```
[예약 확정] → Reservations (CONFIRMED 상태)
  ↓
[예약 시작 10분 전]
  ↓
[Notifications] "토큰 생성 가능" 알림
  ↓
[사용자] POST /api/access/generate
  ├─ 예약 소유권 확인 (Auth)
  ├─ 예약 상태 확인 (Reservations)
  ├─ 시간대 확인 (10분 전 ~ 30분 후)
  └─ 토큰 생성 (QR 32자리 or PIN 6자리)
  ↓
[RoomAccess 저장]
  ├─ reservationId, userId, roomId
  ├─ accessMethod, accessToken
  ├─ expiresAt (시작 30분 후)
  └─ isUsed: false
  ↓
[Notifications] QR 코드/PIN 전송
```

#### 2. 출입 승인 프로세스
```
[사용자] 방 도착
  ↓
[QR 스캔 or PIN 입력]
  ↓
[출입 단말기] POST /api/access/verify
  ├─ 토큰 존재 확인
  ├─ isUsed 확인 (false여야 함)
  ├─ expiresAt 확인 (만료 안됨)
  └─ 예약 시간대 확인
  ↓ (검증 통과)
[RoomAccess 업데이트]
  ├─ isUsed: true
  └─ accessTime: now (실제 입장 시간)
  ↓
[출입 승인] → 도어락 개방 (IoT)
  ↓
[Notifications] "입장이 완료되었습니다" 알림
```

#### 3. 노쇼 판정 프로세스
```
[예약 시작]
  ↓
[30분 경과]
  ↓
[Scheduler] 매 10분 체크
  ↓
[Access 조회] WHERE reservationId = ? AND isUsed = true
  ├─ 입장 기록 있음 → 대기
  └─ 입장 기록 없음 → NO_SHOW 처리
  ↓
[Reservations] status = NO_SHOW
  ↓
[Notifications] 사용자에게 노쇼 안내 알림
  ↓
[Admin] 노쇼 통계 집계
```

---

### 핵심 비즈니스 규칙

1. **토큰 생성 조건**
   - 예약 상태: `CONFIRMED`만 가능
   - 시간 제약: 예약 시작 10분 전 ~ 시작 30분 후
   - 소유권: 본인 예약만 가능
   - 재발급: 기존 유효 토큰 있으면 재사용

2. **토큰 보안**
   - 일회용: `isUsed: true` 후 재사용 불가
   - 만료 시간: 예약 시작 30분 후
   - 암호학적 난수: crypto.randomBytes(16) 사용
   - 예측 불가능: QR 32자리 hex, PIN 6자리 랜덤

3. **입장 기록 추적**
   - `isUsed: false` → 미사용 (토큰 생성만)
   - `isUsed: true` + `accessTime` → 실제 입장함
   - 노쇼 판정 기준: 입장 기록 유무

4. **시간 제약**
   ```
   예약 시작: 10:00

   토큰 생성 가능: 09:50 ~ 10:30 (40분 window)
                  ↑           ↑
               10분 전     30분 후

   토큰 만료: 10:30
   ```

5. **방 현재 상태 조회**
   - 조건: `isUsed: true` AND 예약 진행 중
   - 결과: 방 사용 중 여부 + 현재 예약 정보

---

## 핵심 기능

### 1. 입장 토큰 생성 (Generate Access Token)
**위치**: `src/access/access.controller.ts:42`, `src/access/access.service.ts:19`

```typescript
POST /api/access/generate
```

**권한**: 인증된 사용자 (자신의 예약만)

**기능**
- 확정된 예약 기반으로 입장 토큰 발급
- QR 코드 또는 PIN 방식 선택
- 시간 제약 적용

#### 토큰 생성 조건 검증

**1단계: 예약 권한 확인**
```typescript
const reservation = await this.reservationsService.findOne(reservationId, userId);
// ForbiddenException: 본인 예약이 아닌 경우
```

**2단계: 예약 상태 확인**
```typescript
// 취소된 예약
if (reservation.status === ReservationStatus.CANCELLED) {
  throw new BadRequestException('취소된 예약입니다');
}

// 완료된 예약
if (reservation.status === ReservationStatus.COMPLETED) {
  throw new BadRequestException('완료된 예약입니다');
}

// 확정된 예약만 가능
if (reservation.status !== ReservationStatus.CONFIRMED) {
  throw new BadRequestException('확정된 예약만 입장 토큰을 생성할 수 있습니다');
}
```

**3단계: 토큰 생성 시간 제약**
```typescript
const now = new Date();
const startTime = new Date(reservation.startTime);
const tenMinutesBeforeStart = new Date(startTime.getTime() - 10 * 60 * 1000);
const thirtyMinutesAfterStart = new Date(startTime.getTime() + 30 * 60 * 1000);

// 예약 시작 10분 전부터 생성 가능
if (now < tenMinutesBeforeStart) {
  throw new BadRequestException(
    '입장 토큰은 예약 시작 10분 전부터 생성할 수 있습니다'
  );
}

// 예약 시작 30분 후까지 생성 가능
if (now > thirtyMinutesAfterStart) {
  throw new BadRequestException('입장 토큰 생성 시간이 만료되었습니다');
}
```

**토큰 생성 가능 시간**
```
예약 시작 시간: 10:00

생성 가능 시간: 09:50 ~ 10:30 (40분 window)
  ↓                    ↓
10분 전부터      30분 후까지
```

**4단계: 기존 토큰 확인**
```typescript
const existingToken = await this.roomAccessRepository.findOne({
  where: { reservationId, isUsed: false }
});

if (existingToken && new Date() < existingToken.expiresAt) {
  return existingToken; // 기존 유효 토큰 재사용
}
```

**5단계: 토큰 생성**
```typescript
const accessToken = this.generateToken(accessMethod);
const expiresAt = thirtyMinutesAfterStart; // 예약 시작 30분 후

const roomAccess = this.roomAccessRepository.create({
  reservationId,
  userId,
  roomId: reservation.roomId,
  accessMethod,
  accessToken,
  expiresAt,
  isUsed: false
});
```

**응답 예시 (QR)**
```json
{
  "message": "입장 토큰이 생성되었습니다",
  "roomAccess": {
    "id": "abc123...",
    "accessMethod": "QR",
    "accessToken": "a3f5b2c8d1e4f7a9b0c3d6e8f1a2b4c5",
    "expiresAt": "2025-10-15T10:30:00Z",
    "isUsed": false
  }
}
```

**응답 예시 (PIN)**
```json
{
  "message": "입장 토큰이 생성되었습니다",
  "roomAccess": {
    "id": "def456...",
    "accessMethod": "PIN",
    "accessToken": "384729",
    "expiresAt": "2025-10-15T10:30:00Z",
    "isUsed": false
  }
}
```

---

### 2. 입장 토큰 검증 (Verify Access Token)
**위치**: `src/access/access.controller.ts:69`, `src/access/access.service.ts:100`

```typescript
POST /api/access/verify
```

**권한**: 인증된 사용자

**기능**
- 토큰 유효성 검증
- 출입 승인 처리
- 일회용 토큰 소비

#### 검증 프로세스

**1단계: 토큰 조회**
```typescript
const roomAccess = await this.roomAccessRepository.findOne({
  where: { accessToken },
  relations: ['reservation', 'room', 'user']
});

if (!roomAccess) {
  return { success: false, message: '유효하지 않은 토큰입니다' };
}
```

**2단계: 사용 여부 확인**
```typescript
if (roomAccess.isUsed) {
  return { success: false, message: '이미 사용된 토큰입니다' };
}
```

**3단계: 만료 확인**
```typescript
if (new Date() > roomAccess.expiresAt) {
  return { success: false, message: '만료된 토큰입니다' };
}
```

**4단계: 토큰 사용 처리**
```typescript
roomAccess.isUsed = true;
roomAccess.accessTime = new Date(); // 실제 입장 시간 기록
await this.roomAccessRepository.save(roomAccess);

return {
  success: true,
  message: '출입이 승인되었습니다',
  roomAccess
};
```

**성공 응답**
```json
{
  "success": true,
  "message": "출입이 승인되었습니다",
  "roomAccess": {
    "id": "abc123...",
    "room": { "name": "대회의실", "location": "3층" },
    "user": { "name": "홍길동", "department": "개발팀" },
    "reservation": { "title": "프로젝트 미팅", "startTime": "10:00" },
    "accessTime": "2025-10-15T09:55:00Z",
    "isUsed": true
  }
}
```

**실패 응답**
```json
{
  "success": false,
  "message": "이미 사용된 토큰입니다"
}
```

---

### 3. 출입 기록 조회 (Get Access History)
**위치**: `src/access/access.controller.ts:80`, `src/access/access.service.ts:146`

```typescript
GET /api/access/history
```

**권한**: 인증된 사용자 (자신의 기록만)

**기능**
- 로그인한 사용자의 모든 출입 기록 조회
- 예약 및 방 정보 포함
- 최신 기록 먼저 정렬

```typescript
return await this.roomAccessRepository.find({
  where: { userId },
  relations: ['reservation', 'room'],
  order: { createdAt: 'DESC' }
});
```

**응답 예시**
```json
[
  {
    "id": "abc123...",
    "accessMethod": "QR",
    "accessToken": "a3f5b2c8...",
    "accessTime": "2025-10-15T09:55:00Z",
    "isUsed": true,
    "room": { "name": "대회의실", "location": "3층" },
    "reservation": {
      "title": "프로젝트 미팅",
      "startTime": "2025-10-15T10:00:00Z"
    }
  },
  ...
]
```

---

### 4. 방 현재 사용 상태 조회 (Get Current Room Status)
**위치**: `src/access/access.controller.ts:97`, `src/access/access.service.ts:154`

```typescript
GET /api/access/room/:roomId/current
```

**권한**: 인증된 사용자

**기능**
- 특정 방의 실시간 사용 상태 조회
- 현재 진행 중인 예약 확인
- 입장 기록 확인

#### 사용 중 판정 조건

```typescript
// 1. 방 ID 일치
access.roomId = :roomId

// 2. 토큰 사용됨 (실제 입장함)
access.isUsed = true

// 3. 예약 시작 시간 이전 또는 현재
reservation.startTime <= now

// 4. 예약 종료 시간 이후
reservation.endTime > now

// 5. 확정된 예약
reservation.status = CONFIRMED
```

**사용 중인 경우**
```json
{
  "isOccupied": true,
  "currentReservation": {
    "id": "res123...",
    "title": "프로젝트 미팅",
    "startTime": "2025-10-15T10:00:00Z",
    "endTime": "2025-10-15T12:00:00Z",
    "user": { "name": "홍길동", "department": "개발팀" }
  },
  "accessRecords": [
    {
      "id": "access123...",
      "accessMethod": "QR",
      "accessTime": "2025-10-15T09:55:00Z",
      "user": { "name": "홍길동" }
    }
  ]
}
```

**사용 중이 아닌 경우**
```json
{
  "isOccupied": false
}
```

---

## 토큰 생성 메커니즘

### 1. PIN 방식
**위치**: `src/access/access.service.ts:189`

```typescript
private generateToken(method: AccessMethod): string {
  if (method === AccessMethod.PIN) {
    // 6자리 숫자 PIN 생성 (100000 ~ 999999)
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
```

**특징**
- 6자리 숫자
- 범위: 100000 ~ 999999
- 사용자가 수동 입력 가능
- 키패드 입력 방식

**예시**
```
384729
```

---

### 2. QR 코드 방식
**위치**: `src/access/access.service.ts:193`

```typescript
else {
  // QR 코드용 랜덤 토큰 (32자리 hex)
  return crypto.randomBytes(16).toString('hex');
}
```

**특징**
- 32자리 hex 문자열
- crypto.randomBytes(16) 사용
- QR 코드 스캔 방식
- 높은 보안성

**예시**
```
a3f5b2c8d1e4f7a9b0c3d6e8f1a2b4c5
```

**QR 코드 생성 (클라이언트)**
```typescript
import QRCode from 'qrcode';

const qrCodeDataURL = await QRCode.toDataURL(accessToken);
// <img src={qrCodeDataURL} />
```

---

### 3. NFC 방식 (TODO)
**위치**: `src/access/room-access.entity.ts:16`

```typescript
enum AccessMethod {
  QR = 'QR',
  PIN = 'PIN',
  NFC = 'NFC'  // 미구현
}
```

**향후 구현 계획**
- NFC 태그 기반 출입
- 스마트폰 NFC 또는 카드
- 물리적 출입 제어 시스템 연동

---

## API 엔드포인트

| 메서드 | 경로 | 권한 | 설명 |
|--------|------|------|------|
| POST | `/api/access/generate` | 🔓 본인 예약 | 입장 토큰 생성 (QR/PIN) |
| POST | `/api/access/verify` | 🔓 인증 필요 | 입장 토큰 검증 |
| GET | `/api/access/history` | 🔓 본인만 | 내 출입 기록 조회 |
| GET | `/api/access/room/:roomId/current` | 🔓 인증 필요 | 방 현재 사용 상태 |

---

## 보안 및 권한

### 토큰 보안

#### 1. 일회용 토큰 (One-Time Use)
```typescript
isUsed: boolean; // 사용 후 true로 변경
```
- 토큰 재사용 방지
- 입장 기록 무결성 보장

#### 2. 시간 제약
```typescript
expiresAt: Date; // 예약 시작 30분 후
```
- 토큰 유효 시간 제한
- 만료 토큰 자동 무효화

#### 3. 예약 기반 검증
- 예약 상태 확인 (CONFIRMED만)
- 예약 소유자 권한 확인
- 예약 시간대 검증

#### 4. 암호학적 난수 사용
```typescript
crypto.randomBytes(16) // Node.js crypto 모듈
```
- 예측 불가능한 토큰 생성
- 충돌 확률 극히 낮음

---

### 권한 매트릭스

| 작업 | 본인 예약 | 타인 예약 | ADMIN |
|------|-----------|-----------|-------|
| 토큰 생성 | ✅ | ❌ | ✅ |
| 토큰 검증 | ✅ | ✅ | ✅ |
| 출입 기록 조회 | ✅ (본인만) | ❌ | ✅ (via Admin API) |
| 방 상태 조회 | ✅ | ✅ | ✅ |

---

## 코드 위치

### 컨트롤러
- **경로**: `src/access/access.controller.ts`
- **라인 수**: 101줄
- **엔드포인트**: 4개

### 서비스
- **경로**: `src/access/access.service.ts`
- **라인 수**: 198줄
- **메서드**: 5개 (4개 public + 1개 private)

### 엔티티
- **경로**: `src/access/room-access.entity.ts`
- **라인 수**: 67줄

### DTO
- `src/access/dto/generate-access-token.dto.ts` - 토큰 생성
- `src/access/dto/verify-access-token.dto.ts` - 토큰 검증

---

## 데이터 구조

### RoomAccess Entity

```typescript
{
  id: string;                   // UUID
  reservationId: string;        // 예약 ID (FK)
  userId: string;               // 사용자 ID (FK)
  roomId: string;               // 방 ID (FK)
  accessMethod: AccessMethod;   // QR | PIN | NFC
  accessToken: string;          // 토큰 값
  accessTime?: Date;            // 실제 입장 시간 (nullable, 사용 시 기록)
  expiresAt: Date;              // 토큰 만료 시간
  isUsed: boolean;              // 사용 여부 (기본값: false)
  createdAt: Date;              // 토큰 생성 시간

  // Relations
  reservation: Reservation;     // 예약 정보 (ManyToOne)
  user: User;                   // 사용자 정보 (ManyToOne)
  room: Room;                   // 방 정보 (ManyToOne)
}
```

### AccessMethod Enum

```typescript
enum AccessMethod {
  QR = 'QR',      // QR 코드 스캔
  PIN = 'PIN',    // 6자리 PIN 입력
  NFC = 'NFC'     // NFC 태그 (미구현)
}
```

---

## 타임라인 예시

```
예약 시간: 10:00 ~ 12:00

09:49  ❌ 토큰 생성 불가 (10분 전부터 가능)
09:50  ✅ 토큰 생성 가능 (10분 전)
09:55  ✅ 토큰 생성 (QR/PIN)
10:00  ✅ 예약 시작
10:05  ✅ 토큰 검증 → 입장 승인 (isUsed: true, accessTime: 10:05)
10:30  ⏰ 토큰 만료 (예약 시작 30분 후)
10:31  ❌ 토큰 생성 불가 (30분 후까지만 가능)
10:31  ❌ 기존 토큰 사용 불가 (만료됨)
12:00  ✅ 예약 종료
```

---

## 노쇼 방지 메커니즘

### 1. 입장 기록 추적
```typescript
accessTime?: Date;  // 실제 입장 시간
isUsed: boolean;    // 토큰 사용 여부
```

### 2. Scheduler 연동
**위치**: `src/scheduler/scheduler.service.ts`

```typescript
// 예약 시작 30분 경과 시
if (!reservation.roomAccess || !reservation.roomAccess.isUsed) {
  // 입장 기록 없음 → NO_SHOW 처리
  reservation.status = ReservationStatus.NO_SHOW;
}
```

### 3. 노쇼 패턴 분석 (TODO)
- 사용자별 노쇼 횟수 집계
- 반복적 노쇼 사용자 제재
- 예약 제한 또는 경고

---

## 주요 의존성

- `@nestjs/typeorm` - TypeORM 통합
- `typeorm` - ORM
- `crypto` - 토큰 생성 (Node.js 내장)
- `ReservationsService` - 예약 정보 조회

---

## 테스트

### 단위 테스트
- **파일**: `src/access/access.service.spec.ts`
- **커버리지**: AccessService의 모든 메서드

### E2E 테스트
- **파일**: `test/access.e2e-spec.ts`
- **테스트 케이스**: 12개
- **커버리지**:
  - 토큰 생성 (QR, PIN, 시간 제약)
  - 토큰 검증 (정상, 만료, 사용됨, 유효하지 않음)
  - 출입 기록 조회
  - 방 상태 조회 (사용 중, 비어 있음)

---

## 성능 최적화

### 1. 인덱스 전략
```sql
-- 토큰 검증 최적화
CREATE INDEX idx_room_accesses_token ON room_accesses (accessToken);

-- 사용자별 출입 기록 조회 최적화
CREATE INDEX idx_room_accesses_user ON room_accesses (userId, createdAt DESC);

-- 방 상태 조회 최적화
CREATE INDEX idx_room_accesses_room_time ON room_accesses (roomId, isUsed, createdAt);
```

### 2. 쿼리 최적화
- `relations` 옵션으로 N+1 문제 방지
- `createQueryBuilder`로 복잡한 조건 처리

---

## 다음 개선 사항

1. **NFC 방식 구현**
   - NFC 태그 리더 연동
   - 물리적 출입 제어 시스템

2. **생체 인증**
   - 지문 인식
   - 얼굴 인식
   - 다중 인증 (MFA)

3. **출입 로그 분석**
   - 출입 패턴 분석
   - 이상 출입 탐지
   - 보안 경고 시스템

4. **모바일 앱 통합**
   - 푸시 알림 (토큰 생성 알림)
   - 자동 QR 생성
   - 원터치 입장

5. **출입 제어 하드웨어 연동**
   - 도어락 자동 개폐
   - IoT 센서 연동
   - 실시간 출입 모니터링

6. **임시 방문자 토큰**
   - 예약 없는 방문자 입장
   - 시간 제한 임시 토큰
   - 초대 링크 생성

7. **QR 코드 갱신**
   - 동적 QR 코드 (시간별 변경)
   - 보안 강화
   - 재생 공격 방지
