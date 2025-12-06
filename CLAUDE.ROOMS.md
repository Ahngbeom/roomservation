# 🏢 Rooms 도메인 (회의실 관리)

## 📋 목차
- [개요](#개요)
- [도메인 간 관계](#도메인-간-관계)
- [핵심 기능](#핵심-기능)
- [API 엔드포인트](#api-엔드포인트)
- [캐싱 전략](#캐싱-전략)
- [보안 및 권한](#보안-및-권한)
- [코드 위치](#코드-위치)
- [데이터 구조](#데이터-구조)

---

## 개요

Rooms 도메인은 회의실(방) 정보를 관리하는 모듈입니다.

### 주요 책임
- 방 생성, 조회, 수정, 삭제 (CRUD)
- 방 검색 및 필터링 (수용인원, 위치, 시설)
- 예약 가능 시간대 조회
- 운영 시간 관리
- Redis 캐싱을 통한 성능 최적화

---

## 도메인 간 관계

이 도메인의 다른 도메인과의 관계는 [README.md의 아키텍처 섹션](README.md#아키텍처-및-도메인-관계)을 참고하세요.

---

## 핵심 기능

### 1. 방 생성 (Create Room)
**위치**: `src/rooms/rooms.controller.ts:50`, `src/rooms/rooms.service.ts:22`

```typescript
POST /api/rooms
```

**권한**: 관리자 전용 (`@Roles(UserRole.ADMIN)`)

**기능**
- 새로운 회의실 등록
- 방 번호 중복 검사
- 운영 시간 설정

**주요 로직**
```typescript
// 1. 방 번호 중복 체크
const existingRoom = await this.roomRepository.findOne({
  where: { roomNumber: createRoomDto.roomNumber }
});
if (existingRoom) {
  throw new ConflictException('방 번호 중복');
}

// 2. 방 생성
const room = this.roomRepository.create(createRoomDto);
const savedRoom = await this.roomRepository.save(room);

// 3. 방 목록 캐시 무효화
await this.cacheService.invalidateRoomsList();
```

**검증 규칙**
- roomNumber: 고유값, 필수
- name: 방 이름, 필수
- capacity: 수용 인원, 1 이상
- location: 위치, 필수
- facilities: 시설 목록 (배열)
- operatingHours: 운영 시간 (요일, 시작/종료 시간)

---

### 2. 방 목록 조회 (Get All Rooms)
**위치**: `src/rooms/rooms.controller.ts:62`, `src/rooms/rooms.service.ts:43`

```typescript
GET /api/rooms?minCapacity=10&location=3층&facilities=빔프로젝터,화이트보드
```

**권한**: 인증된 사용자 (`@UseGuards(JwtAuthGuard)`)

**기능**
- 활성화된 방 목록 조회
- 필터링: 수용인원, 위치, 시설
- Redis 캐싱 (필터 없는 경우만)

**필터링 로직**
```typescript
const queryBuilder = this.roomRepository
  .createQueryBuilder('room')
  .where('room.isActive = :isActive', { isActive: true });

// 수용 인원 필터
if (minCapacity) {
  queryBuilder.andWhere('room.capacity >= :minCapacity', { minCapacity });
}

// 위치 필터 (부분 일치)
if (location) {
  queryBuilder.andWhere('room.location LIKE :location', {
    location: `%${location}%`
  });
}

// 시설 필터 (AND 조건, 모든 시설을 포함해야 함)
if (facilities) {
  const facilityList = facilities.split(',').map(f => f.trim());
  facilityList.forEach((facility, index) => {
    queryBuilder.andWhere(`room.facilities LIKE :facility${index}`, {
      [`facility${index}`]: `%${facility}%`
    });
  });
}
```

**캐싱 전략**
- **캐시 사용**: 필터 없는 전체 목록 조회
- **캐시 키**: `CACHE_KEYS.ROOMS` = `'rooms'`
- **TTL**: `CACHE_TTL.MEDIUM` (5분)
- **무효화**: 방 생성/수정/삭제 시

---

### 3. 방 상세 조회 (Get Room by ID)
**위치**: `src/rooms/rooms.controller.ts:79`, `src/rooms/rooms.service.ts:89`

```typescript
GET /api/rooms/:id
```

**권한**: 인증된 사용자

**기능**
- 특정 방의 상세 정보 조회
- Redis 캐싱

**주요 로직**
```typescript
// 1. 캐시 확인
const cached = await this.cacheService.get<Room>(CACHE_KEYS.ROOM(id));
if (cached) {
  return cached;
}

// 2. DB 조회
const room = await this.roomRepository.findOne({ where: { id } });
if (!room) {
  throw new NotFoundException(`Room with ID ${id} not found`);
}

// 3. 캐시 저장
await this.cacheService.set(CACHE_KEYS.ROOM(id), room, CACHE_TTL.LONG);
```

**캐싱 전략**
- **캐시 키**: `CACHE_KEYS.ROOM(id)` = `'room:{id}'`
- **TTL**: `CACHE_TTL.LONG` (15분)
- **무효화**: 해당 방 수정/삭제 시

---

### 4. 예약 가능 시간대 조회 (Get Availability)
**위치**: `src/rooms/rooms.controller.ts:96`, `src/rooms/rooms.service.ts:148`

```typescript
GET /api/rooms/:id/availability?date=2025-10-13
```

**권한**: 인증된 사용자

**기능**
- 특정 날짜의 방 예약 가능 시간대 조회
- 운영 요일 확인
- 예약된 시간대 제외 (Reservation 모듈 연동)

**주요 로직**
```typescript
// 1. 캐시 확인 (날짜별)
const cacheKey = `${CACHE_KEYS.ROOM_AVAILABILITY(id)}:${date}`;
const cached = await this.cacheService.get<any>(cacheKey);

// 2. 방 정보 조회
const room = await this.findOne(id);

// 3. 운영 요일 확인
const targetDate = new Date(date);
const weekday = targetDate.getDay(); // 0(일) - 6(토)

if (!room.operatingHours.weekdays.includes(weekday)) {
  return {
    date,
    availableSlots: [],
    message: 'Room is not operating on this day'
  };
}

// 4. 예약 가능 시간대 계산 (TODO: Reservation 모듈 연동)
return {
  date,
  operatingHours: room.operatingHours,
  availableSlots: [] // 예약 제외 후 계산
};
```

**캐싱 전략**
- **캐시 키**: `'room:{id}:availability:{date}'`
- **TTL**: `CACHE_TTL.SHORT` (1분) - 예약 상태가 자주 변경
- **무효화**: 해당 방의 예약 생성/취소 시

---

### 5. 방 정보 수정 (Update Room)
**위치**: `src/rooms/rooms.controller.ts:120`, `src/rooms/rooms.service.ts:110`

```typescript
PATCH /api/rooms/:id
```

**권한**: 관리자 전용

**기능**
- 방 정보 부분 수정
- 방 번호 변경 시 중복 검사

**주요 로직**
```typescript
// 1. 방 조회
const room = await this.findOne(id);

// 2. 방 번호 변경 시 중복 체크
if (updateRoomDto.roomNumber && updateRoomDto.roomNumber !== room.roomNumber) {
  const existingRoom = await this.roomRepository.findOne({
    where: { roomNumber: updateRoomDto.roomNumber }
  });
  if (existingRoom) {
    throw new ConflictException('방 번호 중복');
  }
}

// 3. 방 정보 업데이트
Object.assign(room, updateRoomDto);
const updatedRoom = await this.roomRepository.save(room);

// 4. 캐시 무효화
await this.cacheService.invalidateRoom(id);
```

**수정 가능 필드**
- name, capacity, location, facilities, operatingHours, isActive

---

### 6. 방 삭제/비활성화 (Delete Room)
**위치**: `src/rooms/rooms.controller.ts:141`, `src/rooms/rooms.service.ts:138`

```typescript
DELETE /api/rooms/:id
```

**권한**: 관리자 전용

**기능**
- Soft Delete (물리적 삭제 아님)
- `isActive = false`로 변경

**주요 로직**
```typescript
// 1. 방 조회
const room = await this.findOne(id);

// 2. Soft Delete
room.isActive = false;
await this.roomRepository.save(room);

// 3. 캐시 무효화
await this.cacheService.invalidateRoom(id);
```

**Soft Delete 이유**
- 기존 예약 데이터 유지
- 통계 및 히스토리 보존
- 복구 가능성

---

## API 엔드포인트

| 메서드 | 경로 | 권한 | 설명 |
|--------|------|------|------|
| POST | `/api/rooms` | 🔑 ADMIN | 방 생성 |
| GET | `/api/rooms` | 🔓 인증 필요 | 방 목록 조회 (필터링) |
| GET | `/api/rooms/:id` | 🔓 인증 필요 | 방 상세 조회 |
| GET | `/api/rooms/:id/availability` | 🔓 인증 필요 | 예약 가능 시간대 |
| PATCH | `/api/rooms/:id` | 🔑 ADMIN | 방 정보 수정 |
| DELETE | `/api/rooms/:id` | 🔑 ADMIN | 방 삭제 (Soft) |

---

## 캐싱 전략

### 1. 방 목록 캐싱
**키**: `'rooms'`
**TTL**: 5분
**조건**: 필터 없는 전체 목록만

```typescript
// 캐시 확인
if (!hasFilters) {
  const cached = await this.cacheService.get<Room[]>(CACHE_KEYS.ROOMS);
  if (cached) return cached;
}

// 캐시 저장
if (!hasFilters) {
  await this.cacheService.set(CACHE_KEYS.ROOMS, rooms, CACHE_TTL.MEDIUM);
}
```

### 2. 방 상세 캐싱
**키**: `'room:{id}'`
**TTL**: 15분

```typescript
const cached = await this.cacheService.get<Room>(CACHE_KEYS.ROOM(id));
```

### 3. 예약 가능 시간대 캐싱
**키**: `'room:{id}:availability:{date}'`
**TTL**: 1분 (예약 상태 변경 빈도 높음)

### 4. 캐시 무효화

**방 생성 시**
```typescript
await this.cacheService.invalidateRoomsList();
```

**방 수정/삭제 시**
```typescript
await this.cacheService.invalidateRoom(id);
// 내부: room:{id}, room:{id}:availability:*, rooms 모두 무효화
```

---

## 보안 및 권한

### 가드 적용

#### 1. 인증 (모든 엔드포인트)
```typescript
@Controller('api/rooms')
@UseGuards(JwtAuthGuard)
export class RoomsController {}
```

#### 2. 관리자 권한 (CUD 작업)
```typescript
@Post()
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
```

### 권한 매트릭스

| 작업 | USER | ADMIN |
|------|------|-------|
| 방 목록 조회 | ✅ | ✅ |
| 방 상세 조회 | ✅ | ✅ |
| 예약 가능 시간대 | ✅ | ✅ |
| 방 생성 | ❌ | ✅ |
| 방 수정 | ❌ | ✅ |
| 방 삭제 | ❌ | ✅ |

---

## 코드 위치

### 컨트롤러
- **경로**: `src/rooms/rooms.controller.ts`
- **라인 수**: 145줄
- **엔드포인트**: 6개

### 서비스
- **경로**: `src/rooms/rooms.service.ts`
- **라인 수**: 190줄
- **메서드**: 6개

### 엔티티
- **경로**: `src/rooms/room.entity.ts`
- **라인 수**: 51줄

### DTO
- `src/rooms/dto/create-room.dto.ts` - 방 생성
- `src/rooms/dto/update-room.dto.ts` - 방 수정
- `src/rooms/dto/room-query.dto.ts` - 방 목록 필터링
- `src/rooms/dto/availability-query.dto.ts` - 예약 가능 시간대 조회

---

## 데이터 구조

### Room Entity

```typescript
{
  id: string;                    // UUID
  roomNumber: string;            // 방 번호 (고유값, 예: "A-301")
  name: string;                  // 방 이름 (예: "대회의실")
  capacity: number;              // 수용 인원
  location: string;              // 위치 (예: "본관 3층")
  facilities: string[];          // 시설 목록 (예: ["빔프로젝터", "화이트보드"])
  operatingHours: OperatingHours; // 운영 시간
  isActive: boolean;             // 활성화 상태 (기본값: true)
  createdAt: Date;               // 생성 일시
  updatedAt: Date;               // 수정 일시
}
```

### OperatingHours Interface

```typescript
interface OperatingHours {
  startTime: string;   // 시작 시간 (HH:mm, 예: "09:00")
  endTime: string;     // 종료 시간 (HH:mm, 예: "18:00")
  weekdays: number[];  // 운영 요일 (0-6, 0=일요일, 6=토요일)
}
```

**예시**
```json
{
  "startTime": "09:00",
  "endTime": "18:00",
  "weekdays": [1, 2, 3, 4, 5]  // 월-금
}
```

### 방 생성 예시

```json
{
  "roomNumber": "A-301",
  "name": "대회의실",
  "capacity": 20,
  "location": "본관 3층",
  "facilities": ["빔프로젝터", "화이트보드", "화상회의 장비"],
  "operatingHours": {
    "startTime": "09:00",
    "endTime": "18:00",
    "weekdays": [1, 2, 3, 4, 5]
  }
}
```

---

## 주요 의존성

- `@nestjs/typeorm` - TypeORM 통합
- `typeorm` - ORM
- `cache-manager` - Redis 캐싱
- `class-validator` - DTO 유효성 검증
- `class-transformer` - DTO 변환

---

## 테스트

### 단위 테스트
- **파일**: `src/rooms/rooms.service.spec.ts`
- **커버리지**: RoomsService의 모든 메서드

### E2E 테스트
- **파일**: `test/rooms.e2e-spec.ts`
- **테스트 케이스**: 12개
- **커버리지**:
  - 방 생성 (관리자 권한, 중복 검사)
  - 방 목록 조회 (필터링)
  - 방 상세 조회 (404 에러)
  - 예약 가능 시간대
  - 방 수정 (관리자 권한)
  - 방 삭제 (Soft Delete)

---

## 성능 최적화

### 1. 캐싱 계층
- **Level 1**: Redis 캐시 (TTL 기반)
- **Level 2**: DB 쿼리 최적화 (인덱스)

### 2. 인덱스
- `roomNumber`: UNIQUE 인덱스
- `isActive`: 조회 성능 향상

### 3. 쿼리 최적화
- `createQueryBuilder` 사용 (동적 필터링)
- `WHERE isActive = true` 조건으로 활성화된 방만 조회

---

## 다음 개선 사항

1. **방 이미지 업로드**
   - S3/CloudFront 연동
   - 방 사진 여러 장 등록

2. **방 좌석 배치도**
   - SVG/Canvas 기반 좌석 배치도
   - 좌석 번호 지정

3. **방 실시간 상태**
   - WebSocket으로 실시간 사용 상태 표시
   - 현재 사용 중인 방 표시

4. **방 이용 통계**
   - 방별 이용률 계산
   - 인기 방 순위
   - 사용 시간대 분석

5. **QR 코드 생성**
   - 방별 고유 QR 코드
   - 모바일 체크인 연동

6. **방 그룹 관리**
   - 방 카테고리 (회의실, 세미나실, 강의실)
   - 그룹별 운영 정책
