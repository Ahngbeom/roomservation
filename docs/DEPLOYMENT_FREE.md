# 무료 배포 가이드 (Render + Neon + Upstash)

이 가이드는 신용카드 등록 없이 완전 무료로 Roomservation API를 배포하는 방법을 설명합니다.

## 구성

| 서비스 | 용도 | 무료 한도 |
|--------|------|----------|
| **Render** | NestJS 백엔드 | 750시간/월, cold start 있음 |
| **Neon** | PostgreSQL | 0.5GB 스토리지, 영구 무료 |
| **Upstash** | Redis | 10,000 요청/일, 영구 무료 |

---

## 1단계: Neon PostgreSQL 설정

### 1.1 계정 생성
1. [https://neon.tech](https://neon.tech) 접속
2. GitHub 또는 이메일로 회원가입 (무료)

### 1.2 프로젝트 생성
1. **Create Project** 클릭
2. Project name: `roomservation`
3. Region: 가까운 지역 선택 (예: Singapore)
4. **Create Project** 클릭

### 1.3 연결 정보 확인
Dashboard에서 **Connection Details** 확인:

```
Host: ep-xxx-xxx-xxx.ap-southeast-1.aws.neon.tech
Database: neondb (또는 생성한 DB명)
User: <your-username>
Password: <your-password>
```

> 💡 **Connection String** 탭에서 전체 URL도 확인 가능

---

## 2단계: Upstash Redis 설정

### 2.1 계정 생성
1. [https://upstash.com](https://upstash.com) 접속
2. GitHub 또는 이메일로 회원가입 (무료)

### 2.2 Redis 데이터베이스 생성
1. **Create Database** 클릭
2. Name: `roomservation-cache`
3. Region: Neon과 같은 지역 선택
4. **Create** 클릭

### 2.3 연결 정보 확인
Database 상세 페이지에서 확인:

```
Endpoint: apn1-xxx-xxx.upstash.io
Port: 6379
Password: xxxxxxxxxx
```

> ⚠️ Upstash는 TLS 연결 필수 (앱에서 자동 처리됨)

---

## 3단계: Render 배포

### 3.1 계정 생성
1. [https://render.com](https://render.com) 접속
2. GitHub로 회원가입 (무료)

### 3.2 GitHub 저장소 연결
1. **New** > **Web Service** 클릭
2. **Connect a repository** 선택
3. `roomservation` 저장소 선택

### 3.3 서비스 설정
```yaml
Name: roomservation-api
Region: Singapore (Neon/Upstash와 동일 권장)
Branch: main
Runtime: Docker
Instance Type: Free
```

### 3.4 환경변수 설정
**Environment** 탭에서 다음 변수들을 추가:

| Key | Value | 설명 |
|-----|-------|------|
| `NODE_ENV` | `production` | 환경 |
| `PORT` | `3000` | 포트 |
| `DB_TYPE` | `postgres` | DB 타입 |
| `DB_HOST` | `ep-xxx.neon.tech` | Neon 호스트 |
| `DB_PORT` | `5432` | DB 포트 |
| `DB_USERNAME` | `<neon-user>` | Neon 사용자 |
| `DB_PASSWORD` | `<neon-password>` | Neon 비밀번호 |
| `DB_DATABASE` | `neondb` | DB 이름 |
| `DB_SSL` | `true` | SSL 활성화 |
| `REDIS_HOST` | `apn1-xxx.upstash.io` | Upstash 호스트 |
| `REDIS_PORT` | `6379` | Redis 포트 |
| `REDIS_PASSWORD` | `<upstash-password>` | Upstash 비밀번호 |
| `REDIS_TLS` | `true` | TLS 활성화 |
| `JWT_ACCESS_SECRET` | `<random-string>` | JWT 시크릿 (직접 생성) |
| `JWT_REFRESH_SECRET` | `<random-string>` | JWT 시크릿 (직접 생성) |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | 토큰 만료 |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | 리프레시 토큰 만료 |
| `CORS_ORIGIN` | `*` | CORS 설정 |

> 💡 JWT 시크릿 생성: `openssl rand -hex 32`

### 3.5 배포
1. **Create Web Service** 클릭
2. 빌드 및 배포 자동 시작 (약 5-10분 소요)
3. 배포 완료 후 URL 확인: `https://roomservation-api.onrender.com`

---

## 4단계: 배포 확인

### 4.1 헬스체크
```bash
curl https://roomservation-api.onrender.com/
# 응답: "Hello Roomservation!"
```

### 4.2 Swagger 문서
```
https://roomservation-api.onrender.com/api-docs
```

### 4.3 회원가입 테스트
```bash
curl -X POST https://roomservation-api.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234!",
    "name": "테스트",
    "phone": "010-1234-5678"
  }'
```

---

## 주의사항

### Render 무료 티어 제한
- **Cold Start**: 15분 비활성 후 첫 요청 시 30초 지연
- **월 750시간**: 24시간 × 31일 = 744시간이므로 충분
- **자동 슬립**: 트래픽 없으면 자동으로 슬립 모드

### Neon 무료 티어 제한
- **0.5GB 스토리지**: 테스트/개발용으로 충분
- **Compute hours**: 월 제한 있음, 유휴 시 자동 일시정지
- **Auto-suspend**: 5분 비활성 후 일시정지 (첫 쿼리 시 ~2초 지연)

### Upstash 무료 티어 제한
- **10,000 요청/일**: 캐시 용도로 충분
- **256MB 메모리**: 캐시 데이터 저장

---

## 트러블슈팅

### 데이터베이스 연결 실패
```
Error: connect ECONNREFUSED
```
- DB_HOST, DB_SSL 환경변수 확인
- Neon 대시보드에서 연결 정보 재확인

### Redis 연결 실패
```
Redis connection failed, falling back to memory cache
```
- REDIS_HOST, REDIS_PASSWORD, REDIS_TLS 확인
- Upstash 대시보드에서 연결 정보 재확인
- 앱은 메모리 캐시로 폴백하므로 동작에는 문제 없음

### Cold Start 지연
- 무료 티어 특성상 불가피
- cron-job.org 등으로 5분마다 헬스체크 요청하여 해결 가능

---

## 비용 요약

| 서비스 | 월 비용 |
|--------|--------|
| Render | $0 |
| Neon | $0 |
| Upstash | $0 |
| **합계** | **$0** |

모든 서비스가 신용카드 등록 없이 사용 가능합니다.
