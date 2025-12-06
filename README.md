# 방 예약 서비스 API

회의실, 세미나실 등 특정 공간에 대해서 예약 서비스를 제공해주는 NestJS 기반 백엔드 API 서버입니다.

## 목차

- [프로젝트 개요](#프로젝트-개요)
- [주요 기능](#주요-기능)
- [프로젝트 현황](#프로젝트-현황)
- [기술 스택](#기술-스택)
- [시스템 아키텍처](#시스템-아키텍처)
- [데이터 모델](#데이터-모델)
- [API 엔드포인트 명세](#api-엔드포인트-명세)
- [인증 & 인가 시스템](#인증--인가-시스템)
- [예약 시스템 비즈니스 로직](#예약-시스템-비즈니스-로직)
- [방 입장 시스템](#방-입장-시스템)
- [실시간 기능 (WebSocket)](#실시간-기능-websocket)
- [보안 요구사항](#보안-요구사항)
- [에러 처리](#에러-처리)
- [환경 설정](#환경-설정)
- [설치 및 실행](#설치-및-실행)
- [테스트](#테스트)
- [개발 및 배포](#개발-및-배포)
- [프론트엔드](#프론트엔드)
- [향후 확장 계획](#향후-확장-계획)

---

## 프로젝트 개요

### 목적

조직 내 공유 공간(회의실, 세미나실 등)의 효율적인 예약 및 관리를 위한 백엔드 API 서비스

### 주요 특징

- 실시간 예약 가능 여부 확인
- 모바일 기기 기반 출입 인증 시스템
- 예약 충돌 방지 및 자동 검증
- WebSocket을 통한 실시간 알림
- Redis 기반 캐싱으로 빠른 응답 속도

---

## 주요 기능

- ✅ **사용자 인증 및 권한 관리** (JWT 기반)
- ✅ **방 관리** (CRUD, 예약 가능 시간대 조회)
- ✅ **예약 관리** (생성, 변경, 취소, 충돌 검사)
- ✅ **방 입장 시스템** (QR/PIN 토큰 기반)
- ✅ **관리자 API** (사용자 관리, 통계)
- ✅ **자동 처리** (No-show 감지, 자동 완료)
- ✅ **실시간 알림** (WebSocket/Socket.io)
- ✅ **API 문서화** (Swagger/OpenAPI)

---

## 프로젝트 현황

### ✅ 완료된 작업

**백엔드**
- [x] 모든 Entity 정의 (User, Room, Reservation, RoomAccess)
- [x] 핵심 비즈니스 로직 구현 (Auth, Users, Rooms, Reservations, Access)
- [x] 관리자 API (사용자 관리, 예약 조회, 통계, 역할 변경)
- [x] 자동 처리 시스템 (Cron 기반 No-show 감지 & 자동 완료)
- [x] WebSocket 실시간 알림 (Socket.io)
- [x] Redis 캐싱 (방, 사용자, 통계 데이터)
- [x] API 문서화 (Swagger)
- [x] **단위 테스트 (111개 테스트 모두 통과) ✅**
- [x] **E2E 테스트 (85개 테스트 모두 통과) ✅**
- [x] 데이터베이스 설정 (TypeORM + PostgreSQL)
- [x] ESLint 설정 최적화 및 코드 품질 개선
- [x] Docker 프로덕션 환경 설정 (Multi-stage build, docker-compose)
- [x] **프로덕션 배포 준비 완료 🚀**

**프론트엔드** (2025-11-22)
- [x] Turborepo Monorepo 구조 설정
- [x] 공통 패키지 (shared-types, api-client, ui-components, utils)
- [x] 사용자 웹앱 (user-web) 기본 구조 및 인증
- [x] 관리자 대시보드 (admin-web) 기본 구조
- [x] 키오스크 앱 (kiosk-web) 기본 구조
- [x] React Router, TanStack Query, Zustand 설정
- [x] Tailwind CSS + shadcn/ui 준비

### 🔄 진행 중
- [ ] Rate Limiting
- [ ] Helmet 보안 설정
- [ ] CI/CD 파이프라인

### 📋 다음 작업
- [ ] CI/CD 파이프라인 구축

---

## 기술 스택

### Backend Framework

- **NestJS 11.x** - TypeScript 기반 서버 프레임워크
  - 모듈화된 아키텍처로 유지보수성 향상
  - DI(Dependency Injection) 패턴 지원
  - 강력한 타입 안정성

### Language

- **TypeScript 5.x** - 정적 타입 체크를 통한 코드 품질 향상

### Database

- **PostgreSQL** - 관계형 데이터베이스
  - TypeORM을 통한 엔티티 관리
  - 트랜잭션 지원으로 데이터 일관성 보장

### Caching & Session

- **Redis** - 인메모리 데이터 저장소
  - 세션 관리
  - 예약 가능 시간대 캐싱
  - Rate limiting 구현

### Real-time Communication

- **WebSocket (Socket.io)** - 실시간 양방향 통신
  - 예약 상태 변경 알림
  - 방 사용 현황 실시간 업데이트

### Authentication

- **JWT (JSON Web Token)** - 토큰 기반 인증
- **bcrypt** - 비밀번호 암호화 (salt rounds: 10)

### Validation

- **class-validator** - DTO 유효성 검증
- **class-transformer** - 데이터 변환

### Testing

- **Jest** - 단위 테스트 및 E2E 테스트 프레임워크

### Code Quality

- **ESLint** - TypeScript 코드 린팅 및 스타일 가이드
- **Prettier** - 코드 포맷팅 자동화

### Documentation

- **Swagger/OpenAPI** - API 자동 문서화

---

## 시스템 아키텍처

```
┌─────────────┐
│   Client    │ (Mobile/Web)
└──────┬──────┘
       │ HTTP/WebSocket
┌──────▼──────────────────────┐
│   API Gateway (NestJS)      │
│  - Authentication Guard     │
│  - Request Validation       │
└──────┬──────────────────────┘
       │
┌──────▼──────────────────────┐
│   Business Logic Layer      │
│  - Auth Module              │
│  - Room Module              │
│  - Reservation Module       │
│  - Access Module            │
│  - Admin Module             │
│  - Scheduler Module         │
│  - Notifications Module     │
└──────┬──────────────────────┘
       │
┌──────▼──────┐  ┌──────────┐
│  PostgreSQL │  │  Redis   │
└─────────────┘  └──────────┘
```

---

## 데이터 모델

### User (사용자)

```typescript
{
  id: string (UUID)
  email: string (unique)
  password: string (hashed)
  name: string
  phone: string
  role: 'ADMIN' | 'USER'
  department: string
  createdAt: Date
  updatedAt: Date
}
```

### Room (방)

```typescript
{
  id: string (UUID)
  roomNumber: string (unique) // 호실
  name: string
  capacity: number // 수용 인원
  location: string // 위치 (건물, 층)
  facilities: string[] // 시설 (프로젝터, 화이트보드 등)
  operatingHours: {
    startTime: string // 'HH:mm'
    endTime: string
    weekdays: number[] // 0-6 (일-토)
  }
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
```

### Reservation (예약)

```typescript
{
  id: string (UUID)
  roomId: string (FK)
  userId: string (FK)
  title: string
  purpose: string
  startTime: Date
  endTime: Date
  attendees: number
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW'
  cancellationReason?: string
  createdAt: Date
  updatedAt: Date
}
```

### RoomAccess (방 입장 기록)

```typescript
{
  id: string (UUID)
  reservationId: string (FK)
  userId: string (FK)
  roomId: string (FK)
  accessMethod: 'QR' | 'PIN' | 'NFC'
  accessToken: string // 일회용 토큰
  accessTime?: Date
  expiresAt: Date
  isUsed: boolean
}
```

---

## API 엔드포인트 명세

### 인증 (Auth)

- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인
- `POST /api/auth/logout` - 로그아웃
- `POST /api/auth/refresh` - 토큰 갱신
- `GET /api/auth/profile` - 내 프로필 조회
- `PATCH /api/auth/profile` - 프로필 수정
- `PATCH /api/auth/password` - 비밀번호 변경

### 방 관리 (Rooms)

- `GET /api/rooms` - 방 목록 조회 (필터: 수용인원, 시설, 위치)
- `GET /api/rooms/:id` - 방 상세 조회
- `POST /api/rooms` - 방 생성 (ADMIN)
- `PATCH /api/rooms/:id` - 방 정보 수정 (ADMIN)
- `DELETE /api/rooms/:id` - 방 삭제/비활성화 (ADMIN)
- `GET /api/rooms/:id/availability` - 특정 방의 예약 가능 시간대 조회

### 예약 관리 (Reservations)

- `GET /api/reservations` - 내 예약 목록
- `GET /api/reservations/:id` - 예약 상세 조회
- `POST /api/reservations` - 예약 신청
- `PATCH /api/reservations/:id` - 예약 변경 요청
- `DELETE /api/reservations/:id` - 예약 취소
- `POST /api/reservations/:id/confirm` - 예약 확정 (ADMIN)
- `GET /api/reservations/room/:roomId` - 특정 방의 예약 현황

### 방 입장 (Access)

- `POST /api/access/generate` - 입장 토큰 생성 (예약 기반)
- `POST /api/access/verify` - 입장 토큰 검증 및 출입 승인
- `GET /api/access/history` - 내 출입 기록
- `GET /api/access/room/:roomId/current` - 방 현재 사용 상태

### 관리자 (Admin)

- `GET /api/admin/users` - 전체 사용자 목록
- `GET /api/admin/reservations` - 전체 예약 현황
- `GET /api/admin/statistics` - 사용 통계
- `PATCH /api/admin/users/:id/role` - 사용자 권한 변경

### API 문서

서버 실행 후 다음 URL에서 Swagger API 문서를 확인할 수 있습니다:

```
http://localhost:3000/api-docs
```

---

## 인증 & 인가 시스템

### 인증 방식

- **JWT 기반 토큰 인증**
  - Access Token: 15분 유효
  - Refresh Token: 7일 유효, HttpOnly 쿠키로 전달

### 권한 레벨

- **ADMIN**: 모든 기능 접근, 방 관리, 사용자 관리
- **USER**: 예약 신청/조회/취소, 자신의 예약에 대한 입장 토큰 생성

### 보안 규칙

- 모든 API는 기본적으로 인증 필요 (auth/register, auth/login 제외)
- ADMIN 전용 API는 역할 기반 Guard 적용
- 사용자는 자신의 예약만 조회/수정/취소 가능

---

## 예약 시스템 비즈니스 로직

### 예약 상태 흐름

```
PENDING → CONFIRMED → COMPLETED
   ↓
CANCELLED
   ↓
NO_SHOW (자동)
```

### 예약 생성 규칙

1. 예약 시간이 방의 운영 시간 내에 있어야 함
2. 해당 시간대에 다른 예약이 없어야 함 (충돌 검증)
3. 예약 시작 시간은 현재 시간 이후여야 함
4. 최소 예약 시간: 30분
5. 최대 예약 시간: 8시간
6. 참석 인원이 방 수용 인원을 초과할 수 없음

### 예약 변경 규칙

- 예약 시작 1시간 전까지만 변경 가능
- 변경 시에도 동일한 생성 규칙 적용

### 예약 취소 규칙

- 예약 시작 30분 전까지만 취소 가능
- 취소 사유 입력 필수
- 취소 시 자동으로 입장 토큰 무효화

### 자동 처리

- **No-show 감지**: 예약 시작 시간 10분 후까지 입장하지 않으면 자동 취소 (5분마다 실행)
- **자동 완료**: 예약 종료 시간이 지나면 자동으로 COMPLETED 상태로 변경 (10분마다 실행)

---

## 방 입장 시스템

### 입장 인증 프로세스

1. 사용자가 예약 상세 페이지에서 "입장 토큰 생성" 요청
2. 서버가 일회용 토큰 생성 (QR 코드 또는 PIN)
   - 유효 시간: 예약 시작 10분 전 ~ 예약 시작 30분 후
3. 사용자가 방 입구의 디바이스에서 토큰 제시
4. 디바이스가 서버에 토큰 검증 요청
5. 서버가 토큰 유효성 확인 후 출입 승인
6. 문이 자동으로 오픈되거나 락이 해제됨

### 입장 토큰 타입

- **QR 코드**: 모바일 앱에서 QR 코드 표시
- **PIN**: 6자리 숫자 코드 입력
- **NFC** (향후 확장): NFC 태그를 통한 인증

### 보안 조치

- 토큰은 일회용으로 사용 후 즉시 무효화
- 토큰 생성 시 사용자 인증 정보와 예약 정보 검증
- 유효 시간 외 사용 시도 시 거부 및 로그 기록

---

## 실시간 기능 (WebSocket)

### WebSocket 엔드포인트

```
ws://localhost:3000/notifications
```

### 이벤트 목록

- `reservation:created` - 새 예약 생성 알림
- `reservation:updated` - 예약 변경 알림
- `reservation:cancelled` - 예약 취소 알림
- `reservation:completed` - 예약 완료 알림
- `reservation:no_show` - No-show 감지 알림
- `room:occupied` - 방 사용 시작 알림
- `room:available` - 방 사용 종료 알림
- `access:granted` - 출입 승인 알림
- `access:denied` - 출입 거부 알림

### 구독 패턴

- 사용자는 자신의 예약에 대한 이벤트만 수신
- 관리자는 모든 이벤트 수신 가능
- 특정 방의 상태 변경 이벤트 구독 가능

---

## 보안 요구사항

### API 보안

- **Rate Limiting**: 동일 IP에서 분당 100회 요청 제한 (구현 예정)
- **CORS**: 허용된 도메인만 접근 가능
- **Helmet**: HTTP 헤더 보안 강화 (구현 예정)
- **Input Validation**: 모든 입력 데이터 검증 (class-validator)

### 데이터 보안

- 비밀번호는 bcrypt로 암호화 (salt rounds: 10)
- JWT 시크릿 키는 환경 변수로 관리
- SQL Injection 방지: TypeORM의 파라미터화된 쿼리 사용
- XSS 방지: 입력 데이터 sanitization

### 인프라 보안

- HTTPS 필수
- 환경 변수 암호화 저장
- 정기적인 보안 패치 적용

---

## 에러 처리

### HTTP 상태 코드

- `200 OK` - 성공
- `201 Created` - 리소스 생성 성공
- `400 Bad Request` - 잘못된 요청
- `401 Unauthorized` - 인증 실패
- `403 Forbidden` - 권한 없음
- `404 Not Found` - 리소스 없음
- `409 Conflict` - 예약 충돌
- `422 Unprocessable Entity` - 유효성 검증 실패
- `500 Internal Server Error` - 서버 오류

### 에러 응답 형식

```json
{
  "statusCode": 400,
  "message": "예약 시간이 운영 시간을 벗어났습니다",
  "error": "Bad Request",
  "timestamp": "2025-10-11T14:30:00.000Z",
  "path": "/api/reservations"
}
```

---

## 환경 설정

### 필수 환경 변수 (.env)

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=roomservation
DB_PASSWORD=your_password
DB_DATABASE=roomservation

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_ACCESS_SECRET=your_access_secret_key
JWT_REFRESH_SECRET=your_refresh_secret_key
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:5173

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100
```

---

## 설치 및 실행

### Docker 개발 환경 설정 (권장) 🐳

**필요한 서비스만 선택적으로 실행:**

```bash
# 인프라만 실행 (PostgreSQL + Redis)
npm run docker:infra

# 백엔드 개발 (인프라 + API)
npm run docker:backend

# 프론트엔드 전체 (인프라 + 백엔드 + 3개 프론트)
npm run docker:frontend

# 특정 앱만 실행
npm run docker:user    # 사용자 웹
npm run docker:admin   # 관리자 대시보드
npm run docker:kiosk   # 키오스크

# 전체 실행 (모든 서비스)
npm run docker:dev:build
```

**서비스 접속:**
- 백엔드 API: http://localhost:3000
- Swagger 문서: http://localhost:3000/api-docs
- 사용자 웹: http://localhost:5173
- 관리자 대시보드: http://localhost:5174
- 키오스크: http://localhost:5175

**유용한 명령어:**
```bash
# 로그 확인
npm run docker:dev:logs

# 서비스 종료
npm run docker:dev:down

# 완전 초기화 (DB 포함)
npm run docker:dev:clean
```

**개발 시나리오별 추천:**
- 백엔드 개발: `npm run docker:infra` + 로컬에서 `npm run start:dev`
- 프론트 개발: `npm run docker:backend` + 로컬에서 `npm run frontend:dev`
- 통합 테스트: `npm run docker:dev:build`

**자세한 가이드**: [README.DOCKER.DEV.md](README.DOCKER.DEV.md)

---

### 로컬 개발 환경 설정 (수동)

**백엔드 + 프론트엔드를 로컬에서 직접 실행:**

```bash
# 1. PostgreSQL, Redis 실행 (Docker)
docker-compose up -d postgres redis

# 2. 백엔드 의존성 설치
npm install

# 3. 프론트엔드 의존성 설치
npm run frontend:install

# 4. 환경 변수 설정
cp .env.example .env

# 5. 백엔드 + 프론트엔드 동시 실행
npm run dev:all

# 또는 별도 터미널에서 각각 실행
# 터미널 1: 백엔드
npm run start:dev

# 터미널 2: 프론트엔드
npm run frontend:dev
```

### 다른 실행 모드

```bash
# 일반 모드
npm run start

# 프로덕션 모드
npm run start:prod

# Docker 프로덕션 배포
npm run docker:prod:build
```

### 데이터베이스 설정

데이터베이스 설정에 대한 자세한 내용은 [README.DATABASE.md](README.DATABASE.md)를 참고하세요.

---

## 테스트

### 테스트 전략

- **Unit Test**: 각 서비스의 비즈니스 로직 테스트 (111개 테스트)
- **E2E Test**: 전체 사용자 플로우 테스트 (5개 모듈, 주요 시나리오 커버)

### 테스트 실행

```bash
# 단위 테스트
npm test

# E2E 테스트
npm run test:e2e

# 테스트 커버리지
npm run test:cov
```

**현재 테스트 현황**:
- ✅ **단위 테스트**: 11개 스위트, 111개 테스트 모두 통과
- ✅ **E2E 테스트**: 6개 스위트, 85개 테스트 모두 통과 (100%)
  - `auth.e2e-spec.ts` - 인증 플로우 (회원가입, 로그인, 프로필 관리, 비밀번호 변경)
  - `rooms.e2e-spec.ts` - 방 관리 (CRUD, 권한 검증, 예약 가능 시간대)
  - `reservations.e2e-spec.ts` - 예약 관리 (생성, 조회, 변경, 취소, 충돌 검증)
  - `access.e2e-spec.ts` - 방 입장 (토큰 생성, 검증, 출입 기록)
  - `admin.e2e-spec.ts` - 관리자 기능 (사용자 관리, 통계, 권한 관리)
  - `app.e2e-spec.ts` - 기본 헬스체크

**참고**: E2E 테스트는 실제 데이터베이스 환경 (PostgreSQL + Redis)이 필요합니다. 자세한 테스트 가이드는 [README.TESTING.md](README.TESTING.md)를 참고하세요.

---

## 개발 및 배포

### 개발 스크립트

```bash
# 코드 포맷팅
npm run format

# 린팅 (자동 수정 포함)
npm run lint

# 빌드
npm run build

# TypeORM 마이그레이션
npm run migration:run
```

### 코드 품질 관리

프로젝트는 ESLint와 Prettier를 사용하여 일관된 코드 스타일을 유지합니다.

#### ESLint 설정
- TypeScript ESLint 권장 규칙 적용
- Prettier와 통합하여 포맷팅 충돌 방지
- 사용되지 않는 변수는 `_` 접두사 규칙 적용
- NestJS 프로젝트 구조에 최적화

#### Prettier 설정
- `endOfLine: "auto"` - 운영체제별 줄바꿈 자동 처리
- 일관된 코드 포맷팅 자동 적용

**린팅 상태**: ✅ 모든 ESLint 규칙 통과 (0 에러, 0 경고)

### 프로젝트 구조

```
src/
├── auth/               # 인증 모듈
├── users/             # 사용자 모듈
├── rooms/             # 방 관리 모듈
├── reservations/      # 예약 관리 모듈
├── access/            # 방 입장 모듈
├── admin/             # 관리자 모듈
├── scheduler/         # 자동 처리 모듈 (Cron Jobs)
├── notifications/     # WebSocket 실시간 알림
├── cache/             # Redis 캐싱 모듈
├── database/          # 데이터베이스 설정
└── main.ts           # 애플리케이션 진입점
```

### CI/CD

- GitHub Actions를 통한 자동화
- 테스트 자동 실행
- Docker 이미지 빌드 및 배포

### 배포 환경

- **Production**: AWS EC2 / GCP Compute Engine
- **Database**: AWS RDS / Google Cloud SQL
- **Cache**: AWS ElastiCache / Google Memorystore
- **Container**: Docker + Docker Compose

### Docker 프로덕션 배포

Docker를 사용한 프로덕션 배포 가이드는 [README.DOCKER.md](README.DOCKER.md)를 참고하세요.

**주요 특징:**
- Multi-stage build로 최적화된 이미지 크기
- Non-root 사용자로 안전한 실행
- PostgreSQL + Redis + API 서버 통합 환경
- 헬스체크 및 자동 재시작 설정

**빠른 시작:**
```bash
# 전체 스택 실행 (프로덕션)
docker compose --env-file .env.production up -d --build

# 로그 확인
docker compose logs -f api
```

### ipTIME DDNS 배포 (자택/사무실 서버)

ipTIME 공유기의 DDNS를 활용한 자택 서버 배포 가이드는 [README.IPTIME_DEPLOY.md](README.IPTIME_DEPLOY.md)를 참고하세요.

**포함 내용:**
- ipTIME DDNS 설정 및 포트포워딩
- Nginx Reverse Proxy + Let's Encrypt SSL
- 보안 설정 (방화벽, Fail2Ban)
- 데이터베이스 백업 및 모니터링
- 완전한 트러블슈팅 가이드

---

## 프론트엔드

방 예약 서비스의 프론트엔드는 **Turborepo 기반 Monorepo**로 구성되어 있습니다.

### 📁 프로젝트 구조

```
frontend/
├── apps/
│   ├── user-web/          # 사용자용 웹 (포트: 3000)
│   ├── admin-web/         # 관리자 대시보드 (포트: 3001)
│   └── kiosk-web/         # 키오스크 앱 (포트: 3002)
└── packages/
    ├── shared-types/      # 공통 타입 정의
    ├── api-client/        # API 통신 클라이언트
    ├── ui-components/     # 공통 UI 컴포넌트
    └── utils/             # 유틸리티 함수
```

### 🛠 기술 스택

- **Monorepo**: Turborepo
- **Build Tool**: Vite 6
- **Framework**: React 18 + TypeScript 5
- **상태 관리**: Zustand (전역), TanStack Query (서버)
- **UI**: Tailwind CSS 3 + shadcn/ui
- **통신**: Axios, Socket.io-client
- **폼**: React Hook Form + Zod
- **라우팅**: React Router v6

### 🚀 빠른 시작

```bash
cd frontend

# 의존성 설치
npm install

# 환경 변수 설정
cp apps/user-web/.env.example apps/user-web/.env
cp apps/admin-web/.env.example apps/admin-web/.env
cp apps/kiosk-web/.env.example apps/kiosk-web/.env

# 모든 앱 동시 실행
npm run dev

# 특정 앱만 실행
npm run dev:user    # 사용자 웹 (localhost:3000)
npm run dev:admin   # 관리자 대시보드 (localhost:3001)
npm run dev:kiosk   # 키오스크 (localhost:3002)
```

### 📱 애플리케이션

**User Web** - 사용자용 웹 애플리케이션
- 로그인/회원가입
- 방 검색 및 예약 신청
- 예약 관리 및 QR 코드 생성
- 실시간 알림

**Admin Web** - 관리자 대시보드
- 통계 대시보드
- 사용자/방/예약 관리
- 출입 기록 조회

**Kiosk Web** - 입구 키오스크
- QR 코드 스캔
- PIN 입력
- 출입 승인/거부

### 📖 상세 가이드

프론트엔드 개발 가이드는 [frontend/README.md](frontend/README.md)를 참고하세요.

---

## 향후 확장 계획

- [ ] 이메일/SMS 알림 기능
- [ ] 반복 예약 기능
- [ ] 예약 승인 워크플로우
- [ ] 방 사용 통계 대시보드
- [ ] 모바일 앱 (React Native)
- [ ] 결제 시스템 연동 (유료 방)
- [ ] AI 기반 예약 추천
- [ ] 캘린더 연동 (Google Calendar, Outlook)

---

## 📄 라이선스

UNLICENSED
