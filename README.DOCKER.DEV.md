# Docker 개발 환경 가이드

Docker Compose를 사용하여 전체 개발 스택(DB + Redis + 백엔드 + 프론트엔드)을 한 번에 실행하는 가이드입니다.

## 📋 목차

- [사전 요구사항](#사전-요구사항)
- [빠른 시작](#빠른-시작)
- [서비스 구성](#서비스-구성)
- [포트 매핑](#포트-매핑)
- [환경 변수](#환경-변수)
- [개발 워크플로우](#개발-워크플로우)
- [유용한 명령어](#유용한-명령어)
- [트러블슈팅](#트러블슈팅)

---

## 사전 요구사항

### 필수 설치
- **Docker Desktop** 또는 **Docker Engine** (20.10 이상)
- **Docker Compose** (v2.0 이상)

### 설치 확인
```bash
docker --version
docker-compose --version
```

---

## 빠른 시작

### 1. 환경 변수 설정 (선택)

`.env` 파일이 이미 있으면 그대로 사용됩니다. 커스텀 설정이 필요한 경우:

```bash
# .env 파일 확인
cat .env

# 필요시 수정
# DB_USERNAME, DB_PASSWORD, JWT_SECRET 등
```

### 2. 선택적 실행 (권장) 🎯

**필요한 서비스만 선택해서 실행:**

```bash
# 인프라만 실행 (PostgreSQL + Redis)
npm run docker:infra

# 백엔드만 실행 (인프라 + API 서버)
npm run docker:backend

# 전체 프론트엔드 실행 (인프라 + 백엔드 + 3개 프론트)
npm run docker:frontend

# 사용자 웹만 실행 (인프라 + 백엔드 + user-web)
npm run docker:user

# 관리자 웹만 실행 (인프라 + 백엔드 + admin-web)
npm run docker:admin

# 키오스크만 실행 (인프라 + 백엔드 + kiosk-web)
npm run docker:kiosk

# 전체 실행
npm run docker:dev
```

### 3. 전체 스택 실행 (모든 서비스)

```bash
# 모든 서비스 빌드 및 시작
npm run docker:dev:build

# 또는
docker-compose -f docker-compose.dev.yml --profile all up --build
```

### 4. 서비스 접속

**백엔드**
- API 서버: http://localhost:3000
- Swagger 문서: http://localhost:3000/api-docs

**프론트엔드**
- 사용자 웹: http://localhost:5173
- 관리자 대시보드: http://localhost:5174
- 키오스크: http://localhost:5175

**인프라**
- PostgreSQL: localhost:5432
- Redis: localhost:6379

### 5. 종료

```bash
# 서비스 중지 (컨테이너 유지)
docker-compose -f docker-compose.dev.yml stop

# 서비스 중지 및 컨테이너 제거
docker-compose -f docker-compose.dev.yml down

# 볼륨까지 완전 삭제 (데이터베이스 초기화)
docker-compose -f docker-compose.dev.yml down -v
```

---

## 서비스 구성

### 6개 서비스 & Profiles

| 서비스 | 설명 | Profile | 컨테이너명 | 포트 |
|--------|------|---------|-----------|------|
| `postgres` | PostgreSQL 16 | `infra`, `all` | roomservation-dev-postgres | 5432 |
| `redis` | Redis 7 | `infra`, `all` | roomservation-dev-redis | 6379 |
| `api` | NestJS 백엔드 | `backend`, `all` | roomservation-dev-api | 3000 |
| `user-web` | 사용자 웹앱 | `frontend`, `user-web`, `all` | roomservation-dev-user-web | 5173 |
| `admin-web` | 관리자 대시보드 | `frontend`, `admin-web`, `all` | roomservation-dev-admin-web | 5174 |
| `kiosk-web` | 키오스크 앱 | `frontend`, `kiosk-web`, `all` | roomservation-dev-kiosk-web | 5175 |

### Profile 조합 가이드

| 명령어 | Profile | 실행되는 서비스 | 용도 |
|--------|---------|----------------|------|
| `npm run docker:infra` | `infra` | postgres, redis | DB/Redis만 실행, 앱은 로컬 실행 |
| `npm run docker:backend` | `infra`, `backend` | postgres, redis, api | 백엔드 개발 |
| `npm run docker:frontend` | `infra`, `backend`, `frontend` | 전체 (3개 프론트 모두) | 프론트엔드 전체 개발 |
| `npm run docker:user` | `infra`, `backend`, `user-web` | postgres, redis, api, user-web | 사용자 웹 개발 |
| `npm run docker:admin` | `infra`, `backend`, `admin-web` | postgres, redis, api, admin-web | 관리자 웹 개발 |
| `npm run docker:kiosk` | `infra`, `backend`, `kiosk-web` | postgres, redis, api, kiosk-web | 키오스크 개발 |
| `npm run docker:dev` | `all` | 전체 6개 서비스 | 전체 통합 테스트 |

### 서비스 의존성

```
postgres + redis (infra profile)
      ↓
     api (backend profile)
      ↓
user-web + admin-web + kiosk-web (frontend profiles)
```

---

## 포트 매핑

### 호스트 → 컨테이너

| 서비스 | 호스트 포트 | 컨테이너 포트 |
|--------|-----------|-------------|
| PostgreSQL | 5432 | 5432 |
| Redis | 6379 | 6379 |
| API | 3000 | 3000 |
| User Web | 5173 | 5173 |
| Admin Web | 5174 | 5174 |
| Kiosk Web | 5175 | 5175 |

---

## 환경 변수

### `.env` 파일 예시

```env
# Database
DB_USERNAME=admin
DB_PASSWORD=1234
DB_DATABASE=roomservation

# JWT
JWT_ACCESS_SECRET=your_access_secret_key
JWT_REFRESH_SECRET=your_refresh_secret_key
```

### Docker Compose 내부 환경 변수

백엔드 API는 컨테이너 간 통신을 위해 다음 호스트를 사용합니다:
- `DB_HOST=postgres` (컨테이너명)
- `REDIS_HOST=redis` (컨테이너명)

---

## 개발 워크플로우

### 📋 개발 시나리오별 추천 조합

**시나리오 1: 백엔드 API 개발** 🔧
```bash
# DB/Redis만 Docker로, 백엔드는 로컬에서 직접 실행 (디버깅 편함)
npm run docker:infra
npm run start:dev  # 로컬에서 백엔드 실행
```

**시나리오 2: 프론트엔드 개발 (사용자 웹)** 🎨
```bash
# 인프라 + 백엔드 Docker, 프론트는 로컬 실행
npm run docker:backend
cd frontend && npm run dev:user  # 로컬에서 프론트 실행

# 또는 전체 Docker 실행
npm run docker:user
```

**시나리오 3: 전체 통합 테스트** 🧪
```bash
# 모든 서비스를 Docker로 실행
npm run docker:dev:build
```

**시나리오 4: 특정 앱만 개발** 🎯
```bash
# 관리자 대시보드만 개발
npm run docker:admin

# 키오스크만 개발
npm run docker:kiosk
```

**시나리오 5: 프론트엔드 전체 개발** 🌐
```bash
# 3개 프론트엔드 앱 모두 실행
npm run docker:frontend
```

### 🔥 Hot Reload 지원

모든 서비스가 볼륨 마운트를 통해 소스 코드 변경을 실시간 반영합니다.

**백엔드**
```yaml
volumes:
  - ./src:/app/src  # TypeScript 소스
  - ./test:/app/test
```

**프론트엔드**
```yaml
volumes:
  - ./frontend:/app  # 전체 프론트엔드 코드
  - /app/node_modules  # node_modules는 컨테이너 내부 사용
```

### 코드 수정 시

1. 로컬에서 코드 수정
2. **백엔드**: NestJS가 자동으로 재시작 (`--watch` 모드)
3. **프론트엔드**: Vite가 HMR(Hot Module Replacement)로 즉시 반영

### 의존성 추가 시

새로운 npm 패키지를 추가한 경우:

```bash
# 백엔드 의존성 추가
npm install <package-name>
docker-compose -f docker-compose.dev.yml restart api

# 프론트엔드 의존성 추가
cd frontend
npm install <package-name>
docker-compose -f docker-compose.dev.yml restart user-web admin-web kiosk-web
```

또는 컨테이너를 재빌드:

```bash
docker-compose -f docker-compose.dev.yml up --build -d
```

---

## 유용한 명령어

### 로그 확인

```bash
# 전체 로그
docker-compose -f docker-compose.dev.yml logs

# 특정 서비스 로그
docker-compose -f docker-compose.dev.yml logs api
docker-compose -f docker-compose.dev.yml logs user-web

# 실시간 로그 (follow)
docker-compose -f docker-compose.dev.yml logs -f api
```

### 컨테이너 상태 확인

```bash
# 실행 중인 컨테이너 목록
docker-compose -f docker-compose.dev.yml ps

# 상세 정보
docker-compose -f docker-compose.dev.yml ps -a
```

### 컨테이너 내부 접속

```bash
# API 서버 셸 접속
docker exec -it roomservation-dev-api sh

# PostgreSQL 접속
docker exec -it roomservation-dev-postgres psql -U admin -d roomservation

# Redis CLI 접속
docker exec -it roomservation-dev-redis redis-cli
```

### 데이터베이스 관리

```bash
# 데이터베이스 초기화 (주의: 모든 데이터 삭제)
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d postgres redis

# 마이그레이션 실행
docker exec -it roomservation-dev-api npm run migration:run
```

### 특정 서비스만 재시작

```bash
# API만 재시작
docker-compose -f docker-compose.dev.yml restart api

# 프론트엔드만 재시작
docker-compose -f docker-compose.dev.yml restart user-web admin-web kiosk-web
```

### 빌드 캐시 없이 재빌드

```bash
docker-compose -f docker-compose.dev.yml build --no-cache
docker-compose -f docker-compose.dev.yml up -d
```

---

## 트러블슈팅

### 1. 포트 충돌

**증상**: `Error: bind: address already in use`

**해결**:
```bash
# 사용 중인 포트 확인
lsof -ti:3000,5173,5174,5175,5432,6379

# 프로세스 종료
lsof -ti:3000,5173,5174,5175,5432,6379 | xargs kill -9

# 또는 Docker Desktop에서 모든 컨테이너 중지
```

### 2. 컨테이너가 시작되지 않음

**증상**: 컨테이너가 계속 재시작되거나 종료됨

**해결**:
```bash
# 로그 확인
docker-compose -f docker-compose.dev.yml logs <service-name>

# 헬스체크 상태 확인
docker inspect roomservation-dev-postgres | grep -A 10 Health
```

### 3. 데이터베이스 연결 실패

**증상**: `FATAL: database "roomservation" does not exist`

**해결**:
```bash
# PostgreSQL 헬스체크 확인
docker-compose -f docker-compose.dev.yml ps postgres

# 수동으로 데이터베이스 생성
docker exec -it roomservation-dev-postgres psql -U admin -c "CREATE DATABASE roomservation;"
```

### 4. 프론트엔드 빌드 오류

**증상**: `Module not found` 또는 의존성 오류

**해결**:
```bash
# node_modules 재설치
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml build --no-cache user-web admin-web kiosk-web
docker-compose -f docker-compose.dev.yml up -d
```

### 5. Hot Reload가 작동하지 않음

**증상**: 코드 변경이 반영되지 않음

**해결**:
```bash
# 볼륨 마운트 확인
docker inspect roomservation-dev-api | grep -A 10 Mounts

# WSL2 환경에서 파일 시스템 문제 가능성
# → 프로젝트를 WSL 파일시스템으로 이동 (예: /home/username/projects)
```

### 6. 메모리 부족

**증상**: 컨테이너가 느리거나 종료됨

**해결**:
- Docker Desktop 설정에서 메모리 할당량 증가 (최소 4GB 권장)
- Settings → Resources → Advanced → Memory

### 7. 완전 초기화

모든 것을 처음부터 다시 시작:

```bash
# 모든 컨테이너, 볼륨, 네트워크 제거
docker-compose -f docker-compose.dev.yml down -v --remove-orphans

# Docker 이미지 제거
docker rmi $(docker images -q 'roomservation-dev*')

# 재빌드 및 시작
docker-compose -f docker-compose.dev.yml up --build -d
```

---

## 프로덕션 vs 개발

| 구분 | 프로덕션 | 개발 (이 문서) |
|------|---------|--------------|
| Compose 파일 | `docker-compose.yml` | `docker-compose.dev.yml` |
| Dockerfile | `Dockerfile` | `Dockerfile.dev` |
| 환경 | NODE_ENV=production | NODE_ENV=development |
| 볼륨 마운트 | ❌ | ✅ (Hot Reload) |
| 빌드 | Multi-stage (최적화) | Single-stage (빠른 빌드) |
| 포트 | 3000만 노출 | 모든 포트 노출 |

---

## 다음 단계

1. **초기 계정 생성**: [데이터베이스 시드 가이드](./README.md#초기-데이터-생성)
2. **API 테스트**: Swagger UI에서 API 테스트 (http://localhost:3000/api-docs)
3. **프론트엔드 개발**: 각 앱에서 로그인/회원가입 페이지 구현

---

## 참고

- [Docker Compose 문서](https://docs.docker.com/compose/)
- [프로덕션 배포 가이드](./README.DOCKER.md)
- [프로젝트 README](./README.md)
