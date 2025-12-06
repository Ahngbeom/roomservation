# 🔐 Auth 도메인 (인증 및 사용자 관리)

## 📋 목차
- [개요](#개요)
- [도메인 간 관계](#도메인-간-관계)
- [핵심 기능](#핵심-기능)
- [API 엔드포인트](#api-엔드포인트)
- [인증 메커니즘](#인증-메커니즘)
- [보안 특징](#보안-특징)
- [코드 위치](#코드-위치)
- [데이터 구조](#데이터-구조)

---

## 개요

Auth 도메인은 사용자 인증, 권한 관리, 프로필 관리를 담당하는 핵심 모듈입니다.

### 주요 책임
- 사용자 회원가입 및 로그인
- JWT 기반 토큰 발급 및 검증
- 사용자 프로필 조회 및 수정
- 비밀번호 변경 및 관리
- 역할 기반 접근 제어 (RBAC)

---

## 도메인 간 연관 관계

### 역할
**시스템 전반의 보안 계층** - 모든 도메인의 인증/인가 기반

### 연관 도메인

#### 📊 Users (사용자 정보)
**관계**: 1:1 협력 관계
- Auth는 **인증 처리**, Users는 **사용자 데이터 관리**
- 회원가입 시 Users 도메인에 사용자 생성 요청
- 로그인 시 Users 도메인에서 사용자 정보 조회
- **비즈니스 흐름**: 인증 → 사용자 정보 조회 → 토큰 발급

#### 🏢 Rooms (회의실)
**관계**: 보안 제공
- Rooms의 모든 API는 Auth의 인증 필요
- 방 생성/수정/삭제는 관리자 권한 필요 (Auth의 역할 기반 제어)
- **비즈니스 의미**: "인증된 사용자만 방 정보 조회 가능"

#### 📅 Reservations (예약)
**관계**: 보안 + 소유권 제어
- 예약 생성/조회/수정/취소 시 인증 필요
- 본인 예약만 조회/수정/취소 가능 (소유권 검증)
- **비즈니스 의미**: "로그인한 사용자만 예약 가능, 본인 예약만 관리 가능"

#### 🔑 Access (출입 관리)
**관계**: 보안 제공
- 입장 토큰 생성 시 인증 필요
- 본인 예약에 대해서만 토큰 생성 가능
- WebSocket 연결 시에도 JWT 인증 필요
- **비즈니스 의미**: "예약한 사용자만 입장 토큰 생성 가능"

#### 👨‍💼 Admin (관리)
**관계**: 권한 강화
- 모든 Admin API는 관리자 권한 필수
- **비즈니스 의미**: "관리자만 전체 데이터 조회 및 통계 확인 가능"

#### 🔔 Notifications (알림)
**관계**: WebSocket 보안
- WebSocket 연결 시 JWT로 사용자 인증
- 인증된 사용자만 알림 구독 가능
- **비즈니스 의미**: "로그인한 사용자만 실시간 알림 수신 가능"

### 제공하는 보안 기능

| 기능 | 적용 도메인 | 효과 |
|------|------------|------|
| **인증 (JWT)** | 전체 | 로그인한 사용자만 API 접근 |
| **역할 기반 제어 (RBAC)** | Rooms, Admin | 관리자만 특정 기능 수행 |
| **소유권 검증** | Reservations, Access | 본인 데이터만 조회/수정 |
| **WebSocket 인증** | Notifications | 인증된 연결만 알림 수신 |

### 비즈니스 프로세스에서의 역할

```
[사용자 등록 및 로그인]
1. 회원가입 → Users 도메인에 사용자 정보 저장
2. 로그인 → JWT 토큰 발급
3. 이후 모든 요청에 토큰 사용

[예약 프로세스]
1. 인증 확인 (Auth)
2. 방 조회 (Rooms) - 인증된 사용자만
3. 예약 생성 (Reservations) - 로그인 사용자의 ID로 생성
4. 입장 토큰 생성 (Access) - 예약 소유자만
5. 알림 수신 (Notifications) - 인증된 WebSocket 연결만

[관리 프로세스]
1. 관리자 로그인 (Auth) - role: ADMIN
2. 관리자 권한 확인 (Auth의 AdminGuard)
3. 전체 데이터 조회 (Admin) - 관리자만 가능
```

### 데이터 관점

```
User Entity (Users 도메인)
  ├─ role: UserRole (ADMIN | USER)  ← Auth가 권한 제어에 사용
  ├─ password: string (해시됨)      ← Auth가 로그인 검증에 사용
  └─ email: string (unique)         ← Auth가 로그인 ID로 사용

JWT Payload (Auth 생성)
  ├─ sub: user.id                   → 모든 도메인에서 사용자 식별
  ├─ email: user.email
  └─ role: user.role                → 권한 제어에 사용
```

### 횡단 관심사 (Cross-Cutting Concern)

Auth 도메인은 **AOP(Aspect-Oriented Programming)** 패턴처럼 동작:
- 모든 API 호출의 **사전 검증** (Before Advice)
- 권한 없는 접근 차단
- 사용자 컨텍스트 주입 (`@CurrentUser()`)

**예시**:
```
모든 API 요청
    ↓
[Auth Guard] ← 여기서 인증 검증
    ↓ (인증 성공)
[비즈니스 로직 실행]
```

---

## 핵심 기능

### 1. 회원가입 (Register)
**위치**: `src/auth/auth.controller.ts:42`, `src/auth/auth.service.ts:24`

```typescript
POST /api/auth/register
```

**기능**
- 새로운 사용자 계정 생성
- 이메일 중복 검사 (ConflictException)
- 비밀번호 자동 해싱 (bcrypt)

**주요 로직**
1. 이메일 중복 확인 (`usersService.findByEmail`)
2. 중복 시 409 Conflict 에러 반환
3. 신규 사용자 생성 (`usersService.create`)
4. 비밀번호는 `@BeforeInsert` 훅에서 자동 해싱

---

### 2. 로그인 (Login)
**위치**: `src/auth/auth.controller.ts:61`, `src/auth/auth.service.ts:33`

```typescript
POST /api/auth/login
```

**기능**
- 이메일/비밀번호 인증
- Access Token 발급 (응답 본문)
- Refresh Token 발급 (HttpOnly 쿠키)

**주요 로직**
1. 이메일로 사용자 조회
2. 비밀번호 검증 (`user.comparePassword()` - bcrypt.compare)
3. JWT 토큰 생성 (`generateTokens()`)
   - Access Token: 15분 유효 (응답 본문 반환)
   - Refresh Token: 7일 유효 (HttpOnly 쿠키 설정)
4. 쿠키 보안 설정:
   ```typescript
   httpOnly: true,           // XSS 방어
   secure: true (production), // HTTPS only
   sameSite: 'strict',       // CSRF 방어
   maxAge: 7 * 24 * 60 * 60 * 1000  // 7일
   ```

**보안 특징**
- Refresh Token은 JavaScript로 접근 불가 (HttpOnly)
- 비밀번호 오류 시 이메일/비밀번호 모두 "잘못되었습니다" (정보 노출 방지)

---

### 3. 로그아웃 (Logout)
**위치**: `src/auth/auth.controller.ts:89`

```typescript
POST /api/auth/logout
```

**기능**
- Refresh Token 쿠키 삭제
- 클라이언트는 Access Token 직접 삭제

**주요 로직**
- `response.clearCookie('refreshToken')` - 쿠키 무효화

---

### 4. 토큰 갱신 (Refresh)
**위치**: `src/auth/auth.controller.ts:105`, `src/auth/auth.service.ts:51`

```typescript
POST /api/auth/refresh
```

**기능**
- Refresh Token으로 새로운 Access Token 발급
- 새로운 Refresh Token도 함께 갱신

**주요 로직**
1. `@UseGuards(JwtRefreshGuard)` - Refresh Token 검증
2. 새로운 Access Token + Refresh Token 발급
3. 갱신된 Refresh Token을 쿠키에 재설정

**가드**: `JwtRefreshGuard` (Refresh Token 전용)

---

### 5. 프로필 조회 (Get Profile)
**위치**: `src/auth/auth.controller.ts:132`

```typescript
GET /api/auth/profile
```

**기능**
- 현재 로그인한 사용자의 정보 조회
- JWT에서 추출한 사용자 ID로 조회

**주요 로직**
- `@CurrentUser()` 데코레이터로 현재 사용자 주입
- 비밀번호는 `toJSON()` 메서드에서 자동 제거

**가드**: `JwtAuthGuard` (Access Token 필수)

---

### 6. 프로필 수정 (Update Profile)
**위치**: `src/auth/auth.controller.ts:146`, `src/auth/auth.service.ts:55`

```typescript
PATCH /api/auth/profile
```

**기능**
- 사용자 이름, 전화번호, 부서 정보 수정
- 이메일, 역할(role)은 수정 불가

**주요 로직**
- `usersService.update(userId, updateProfileDto)`
- UpdateProfileDto에서 허용된 필드만 수정 가능

**가드**: `JwtAuthGuard`

---

### 7. 비밀번호 변경 (Change Password)
**위치**: `src/auth/auth.controller.ts:173`, `src/auth/auth.service.ts:59`

```typescript
PATCH /api/auth/password
```

**기능**
- 현재 비밀번호 확인 후 새 비밀번호로 변경

**주요 로직**
1. 현재 비밀번호 검증 (`user.comparePassword(currentPassword)`)
2. 검증 실패 시 400 BadRequest
3. 새 비밀번호 설정
4. `@BeforeUpdate` 훅에서 자동 해싱

**가드**: `JwtAuthGuard`

---

## API 엔드포인트

| 메서드 | 경로 | 인증 | 설명 |
|--------|------|------|------|
| POST | `/api/auth/register` | ❌ | 회원가입 |
| POST | `/api/auth/login` | ❌ | 로그인 |
| POST | `/api/auth/logout` | ✅ Access Token | 로그아웃 |
| POST | `/api/auth/refresh` | ✅ Refresh Token | 토큰 갱신 |
| GET | `/api/auth/profile` | ✅ Access Token | 프로필 조회 |
| PATCH | `/api/auth/profile` | ✅ Access Token | 프로필 수정 |
| PATCH | `/api/auth/password` | ✅ Access Token | 비밀번호 변경 |

---

## 인증 메커니즘

### JWT 토큰 구조

```typescript
// JWT Payload
{
  sub: user.id,        // 사용자 ID (UUID)
  email: user.email,   // 이메일
  role: user.role,     // 역할 (ADMIN | USER)
  iat: 1234567890,     // 발급 시간
  exp: 1234568790      // 만료 시간
}
```

### 토큰 유효 시간
- **Access Token**: 15분 (`JWT_ACCESS_EXPIRES_IN`)
- **Refresh Token**: 7일 (`JWT_REFRESH_EXPIRES_IN`)

### 가드 (Guards)

#### 1. JwtAuthGuard
**위치**: `src/auth/guards/jwt-auth.guard.ts`
- Access Token 검증
- 대부분의 인증이 필요한 엔드포인트에서 사용

#### 2. JwtRefreshGuard
**위치**: `src/auth/guards/jwt-refresh.guard.ts`
- Refresh Token 검증 (쿠키에서 추출)
- `/api/auth/refresh` 엔드포인트 전용

#### 3. AdminGuard
**위치**: `src/auth/guards/admin.guard.ts`
- 관리자 권한 검증 (`role === 'ADMIN'`)
- Admin API에서 사용

---

## 보안 특징

### 1. 비밀번호 해싱
**위치**: `src/users/user.entity.ts:91`

```typescript
@BeforeInsert()
@BeforeUpdate()
async hashPassword() {
  if (this.password && !this.password.startsWith('$2b$')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
}
```

- bcrypt 알고리즘 (솔트 라운드: 10)
- 이미 해싱된 비밀번호는 재해싱 방지 (`$2b$` 접두사 체크)
- DB 저장 전 자동 해싱

### 2. 비밀번호 비교
**위치**: `src/users/user.entity.ts:97`

```typescript
async comparePassword(plainPassword: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, this.password);
}
```

### 3. 비밀번호 응답 제외
**위치**: `src/users/user.entity.ts:101`

```typescript
toJSON() {
  const { password: _password, ...result } = this;
  return result;
}
```

- JSON 직렬화 시 자동으로 비밀번호 제거
- 클라이언트로 비밀번호 노출 방지

### 4. HttpOnly 쿠키
- Refresh Token은 JavaScript로 접근 불가
- XSS 공격으로부터 보호

### 5. SameSite 쿠키
- CSRF 공격 방지 (`sameSite: 'strict'`)

### 6. HTTPS Only (프로덕션)
- `secure: process.env.NODE_ENV === 'production'`

---

## 코드 위치

### 컨트롤러
- **경로**: `src/auth/auth.controller.ts`
- **라인 수**: 183줄
- **엔드포인트**: 7개

### 서비스
- **경로**: `src/auth/auth.service.ts`
- **라인 수**: 99줄
- **메서드**: 5개

### 엔티티
- **경로**: `src/users/user.entity.ts`
- **라인 수**: 106줄

### 가드
- `src/auth/guards/jwt-auth.guard.ts` - Access Token 검증
- `src/auth/guards/jwt-refresh.guard.ts` - Refresh Token 검증
- `src/auth/guards/admin.guard.ts` - 관리자 권한 검증

### 데코레이터
- `src/auth/decorators/current-user.decorator.ts` - 현재 사용자 추출

### DTO
- `src/auth/dto/register.dto.ts` - 회원가입 요청
- `src/auth/dto/login.dto.ts` - 로그인 요청
- `src/auth/dto/update-profile.dto.ts` - 프로필 수정
- `src/auth/dto/change-password.dto.ts` - 비밀번호 변경

---

## 데이터 구조

### User Entity

```typescript
{
  id: string;              // UUID
  email: string;           // 고유 이메일 (unique)
  password: string;        // 해시화된 비밀번호
  name: string;            // 사용자 이름
  phone: string;           // 전화번호
  role: UserRole;          // ADMIN | USER (기본값: USER)
  department?: string;     // 부서명 (nullable)
  createdAt: Date;         // 생성 일시
  updatedAt: Date;         // 수정 일시
}
```

### UserRole Enum

```typescript
enum UserRole {
  ADMIN = 'ADMIN',   // 관리자
  USER = 'USER'      // 일반 사용자
}
```

---

## 주요 의존성

- `@nestjs/jwt` - JWT 토큰 생성 및 검증
- `@nestjs/passport` - Passport 통합
- `passport-jwt` - JWT 전략
- `bcrypt` - 비밀번호 해싱
- `class-validator` - DTO 유효성 검증
- `class-transformer` - DTO 변환

---

## 테스트

### 단위 테스트
- **파일**: `src/auth/auth.service.spec.ts`
- **커버리지**: AuthService의 모든 메서드

### E2E 테스트
- **파일**: `test/auth.e2e-spec.ts`
- **테스트 케이스**: 15개
- **커버리지**: 모든 API 엔드포인트 + 에러 케이스

---

## 환경 변수

```env
# JWT 설정
JWT_ACCESS_SECRET=your-access-secret-key
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_REFRESH_EXPIRES_IN=7d
```

---

## 다음 개선 사항

1. **비밀번호 재설정**
   - 이메일 인증 기반 비밀번호 찾기 기능

2. **이중 인증 (2FA)**
   - TOTP 기반 추가 보안 계층

3. **로그인 이력 추적**
   - IP, 디바이스, 로그인 시간 기록

4. **계정 잠금**
   - 연속 로그인 실패 시 임시 잠금

5. **소셜 로그인**
   - Google, Kakao, Naver 등 OAuth 통합
