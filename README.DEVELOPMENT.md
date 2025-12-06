# 개발 환경 가이드

이 문서는 Room Reservation API의 로컬 개발 환경을 설정하는 방법을 설명합니다.

## 📋 목차

1. [개발 환경 개요](#개발-환경-개요)
2. [Docker 설치](#docker-설치)
3. [Docker Compose 개발 환경](#docker-compose-개발-환경)
4. [데이터베이스 개발 설정](#데이터베이스-개발-설정)
5. [환경 변수 설정](#환경-변수-설정)
6. [개발 워크플로우](#개발-워크플로우)
7. [유용한 개발 명령어](#유용한-개발-명령어)
8. [트러블슈팅](#트러블슈팅)

---

## 개발 환경 개요

### 두 가지 개발 방식

본 프로젝트는 두 가지 개발 방식을 지원합니다:

1. **전체 Docker 환경** (권장)
   - 모든 서비스를 Docker Compose로 실행
   - 환경 일관성 보장
   - 빠른 온보딩

2. **하이브리드 환경**
   - 인프라(DB, Redis)만 Docker
   - 백엔드/프론트엔드는 로컬 실행
   - 디버깅 용이

### 기술 스택

**백엔드**
- Node.js 20.x
- NestJS 10
- TypeScript 5
- PostgreSQL 16
- Redis 7

**프론트엔드 (Turborepo 모노레포)**
- React 18 + TypeScript
- Vite 6
- Tailwind CSS 3

---

## Docker 설치

### WSL2 환경 (Windows 사용자)

WSL2 환경에서 Docker를 사용하는 두 가지 방법이 있습니다.

#### 방법 1: Docker Desktop for Windows (권장) ⭐

가장 간단하고 권장되는 방법입니다.

**설치 단계:**

1. **Docker Desktop 다운로드**
   - https://www.docker.com/products/docker-desktop 접속
   - "Download for Windows" 클릭

2. **설치 실행**
   - 다운로드한 `Docker Desktop Installer.exe` 실행
   - "Use WSL 2 instead of Hyper-V" 옵션 체크
   - 설치 완료 후 재부팅

3. **WSL2 통합 활성화**
   - Docker Desktop 실행
   - Settings → Resources → WSL Integration
   - "Enable integration with my default WSL distro" 체크
   - Ubuntu 배포판 활성화
   - "Apply & Restart" 클릭

4. **설치 확인**
   ```bash
   docker --version
   docker compose version
   ```

**장점:**
- GUI 제공으로 관리가 쉬움
- WSL2와 자동 통합
- Windows와 WSL2 모두에서 사용 가능
- 업데이트 자동 관리

#### 방법 2: WSL2 내에서 Docker Engine 직접 설치

**1. 기존 Docker 패키지 제거 (있다면)**

```bash
sudo apt-get remove docker docker-engine docker.io containerd runc
```

**2. 필수 패키지 설치**

```bash
sudo apt-get update
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release
```

**3. Docker GPG 키 추가**

```bash
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
```

**4. Docker 저장소 추가**

```bash
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

**5. Docker Engine 설치**

```bash
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin
```

**6. Docker 서비스 시작**

```bash
# systemd가 활성화되어 있다면
sudo systemctl start docker
sudo systemctl enable docker

# systemd가 없다면 (WSL2 구버전)
sudo service docker start
```

**7. 사용자를 docker 그룹에 추가 (sudo 없이 사용)**

```bash
sudo usermod -aG docker $USER
# 터미널 재시작 후 적용됨
newgrp docker
```

**8. 설치 확인**

```bash
docker --version
docker compose version
docker run hello-world
```

### Linux 환경

```bash
# Docker 설치
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 현재 사용자를 docker 그룹에 추가
sudo usermod -aG docker $USER

# 로그아웃 후 다시 로그인 (또는 재부팅)

# Docker Compose 설치
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 설치 확인
docker --version
docker-compose --version
```

### macOS 환경

```bash
# Homebrew로 Docker Desktop 설치
brew install --cask docker

# 또는 공식 사이트에서 다운로드:
# https://www.docker.com/products/docker-desktop

# Docker Desktop 실행 후 확인
docker --version
docker compose version
```

### systemd 활성화 (WSL2, 필요시)

WSL2에서 systemd를 사용하려면:

1. `/etc/wsl.conf` 파일 생성/수정:
   ```bash
   sudo nano /etc/wsl.conf
   ```

2. 다음 내용 추가:
   ```ini
   [boot]
   systemd=true
   ```

3. WSL 재시작 (Windows PowerShell에서):
   ```powershell
   wsl --shutdown
   ```

4. WSL2 다시 시작

---

## Docker Compose 개발 환경

Docker Compose를 사용하여 전체 개발 스택(DB + Redis + 백엔드 + 프론트엔드)을 한 번에 실행합니다.

### 빠른 시작

#### 1. 환경 변수 설정 (선택)

`.env` 파일이 이미 있으면 그대로 사용됩니다. 커스텀 설정이 필요한 경우:

```bash
# .env 파일 확인
cat .env

# 필요시 수정
# DB_USERNAME, DB_PASSWORD, JWT_SECRET 등
```

#### 2. 선택적 실행 (권장) 🎯

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

#### 3. 전체 스택 실행 (모든 서비스)

```bash
# 모든 서비스 빌드 및 시작
npm run docker:dev:build

# 또는
docker-compose -f docker-compose.dev.yml --profile all up --build
```

#### 4. 서비스 접속

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

#### 5. 종료

```bash
# 서비스 중지 (컨테이너 유지)
npm run docker:dev:down

# 서비스 중지 및 컨테이너 제거
docker-compose -f docker-compose.dev.yml down

# 볼륨까지 완전 삭제 (데이터베이스 초기화)
npm run docker:dev:clean
```

### 서비스 구성

#### 6개 서비스 & Profiles

| 서비스 | 설명 | Profile | 컨테이너명 | 포트 |
|--------|------|---------|-----------|------|
| `postgres` | PostgreSQL 16 | `infra`, `all` | roomservation-dev-postgres | 5432 |
| `redis` | Redis 7 | `infra`, `all` | roomservation-dev-redis | 6379 |
| `api` | NestJS 백엔드 | `backend`, `all` | roomservation-dev-api | 3000 |
| `user-web` | 사용자 웹앱 | `frontend`, `user-web`, `all` | roomservation-dev-user-web | 5173 |
| `admin-web` | 관리자 대시보드 | `frontend`, `admin-web`, `all` | roomservation-dev-admin-web | 5174 |
| `kiosk-web` | 키오스크 앱 | `frontend`, `kiosk-web`, `all` | roomservation-dev-kiosk-web | 5175 |

#### Profile 조합 가이드

| 명령어 | Profile | 실행되는 서비스 | 용도 |
|--------|---------|----------------|------|
| `npm run docker:infra` | `infra` | postgres, redis | DB/Redis만 실행, 앱은 로컬 실행 |
| `npm run docker:backend` | `infra`, `backend` | postgres, redis, api | 백엔드 개발 |
| `npm run docker:frontend` | `infra`, `backend`, `frontend` | 전체 (3개 프론트 모두) | 프론트엔드 전체 개발 |
| `npm run docker:user` | `infra`, `backend`, `user-web` | postgres, redis, api, user-web | 사용자 웹 개발 |
| `npm run docker:admin` | `infra`, `backend`, `admin-web` | postgres, redis, api, admin-web | 관리자 웹 개발 |
| `npm run docker:kiosk` | `infra`, `backend`, `kiosk-web` | postgres, redis, api, kiosk-web | 키오스크 개발 |
| `npm run docker:dev` | `all` | 전체 6개 서비스 | 전체 통합 테스트 |

#### 서비스 의존성

```
postgres + redis (infra profile)
      ↓
     api (backend profile)
      ↓
user-web + admin-web + kiosk-web (frontend profiles)
```

### 포트 매핑

| 서비스 | 호스트 포트 | 컨테이너 포트 |
|--------|-----------|-------------|
| PostgreSQL | 5432 | 5432 |
| Redis | 6379 | 6379 |
| API | 3000 | 3000 |
| User Web | 5173 | 5173 |
| Admin Web | 5174 | 5174 |
| Kiosk Web | 5175 | 5175 |

---

## 데이터베이스 개발 설정

### TypeORM 동기화 (개발 환경)

개발 환경에서는 `synchronize: true` 설정으로 자동으로 스키마가 생성됩니다.

```bash
# 개발 서버 실행 (자동으로 테이블 생성)
npm run start:dev
```

### 수동으로 데이터베이스 생성 (로컬 PostgreSQL)

로컬에 PostgreSQL을 직접 설치한 경우:

```bash
# PostgreSQL 접속
sudo -u postgres psql

# 데이터베이스 생성
CREATE DATABASE roomservation;

# 사용자 생성 (선택사항)
CREATE USER admin WITH PASSWORD '1234';
GRANT ALL PRIVILEGES ON DATABASE roomservation TO admin;

# 종료
\q
```

### 마이그레이션 (선택사항)

개발 중에도 마이그레이션을 사용할 수 있습니다:

```bash
# 마이그레이션 파일 생성
npm run migration:generate -- src/database/migrations/InitialSchema

# 마이그레이션 실행
npm run migration:run

# 마이그레이션 롤백
npm run migration:revert
```

### 데이터베이스 접속 (Docker)

```bash
# PostgreSQL 컨테이너 접속
docker exec -it roomservation-dev-postgres psql -U admin -d roomservation

# Redis 컨테이너 접속
docker exec -it roomservation-dev-redis redis-cli
```

### 데이터베이스 초기화

```bash
# 데이터베이스 완전 초기화 (주의: 모든 데이터 삭제)
npm run docker:dev:clean
npm run docker:infra
```

---

## 환경 변수 설정

### `.env` 파일 예시

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=admin
DB_PASSWORD=1234
DB_DATABASE=roomservation

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_ACCESS_SECRET=your_access_secret_key_for_dev
JWT_REFRESH_SECRET=your_refresh_secret_key_for_dev
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:5173,http://localhost:5174,http://localhost:5175

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100
```

### Docker Compose 내부 환경 변수

백엔드 API가 Docker 컨테이너로 실행될 때는 컨테이너 간 통신을 위해 다음 호스트를 사용합니다:

- `DB_HOST=postgres` (컨테이너명)
- `REDIS_HOST=redis` (컨테이너명)

---

## 개발 워크플로우

### 📋 개발 시나리오별 추천 조합

#### 시나리오 1: 백엔드 API 개발 🔧

```bash
# DB/Redis만 Docker로, 백엔드는 로컬에서 직접 실행 (디버깅 편함)
npm run docker:infra
npm run start:dev  # 로컬에서 백엔드 실행
```

#### 시나리오 2: 프론트엔드 개발 (사용자 웹) 🎨

```bash
# 인프라 + 백엔드 Docker, 프론트는 로컬 실행
npm run docker:backend
cd frontend && npm run dev:user  # 로컬에서 프론트 실행

# 또는 전체 Docker 실행
npm run docker:user
```

#### 시나리오 3: 전체 통합 테스트 🧪

```bash
# 모든 서비스를 Docker로 실행
npm run docker:dev:build
```

#### 시나리오 4: 특정 앱만 개발 🎯

```bash
# 관리자 대시보드만 개발
npm run docker:admin

# 키오스크만 개발
npm run docker:kiosk
```

#### 시나리오 5: 프론트엔드 전체 개발 🌐

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

## 유용한 개발 명령어

### 로그 확인

```bash
# 전체 로그 (npm 스크립트)
npm run docker:dev:logs

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
npm run docker:dev:clean
npm run docker:infra

# 마이그레이션 실행 (Docker 환경)
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

### 1. Docker 데몬 연결 실패

**문제**: `Cannot connect to the Docker daemon`

**해결방법:**

```bash
# Docker Desktop이 실행 중인지 확인 (Windows/macOS)
# Windows에서 Docker Desktop 실행

# Linux: Docker 서비스 시작
sudo systemctl start docker

# WSL2: service 명령 사용
sudo service docker start
```

### 2. 권한 문제

**문제**: `permission denied`

**해결방법:**

```bash
sudo usermod -aG docker $USER
# 로그아웃 후 다시 로그인하거나 터미널 재시작
newgrp docker
```

### 3. 포트 충돌

**증상**: `Error: bind: address already in use`

**해결방법:**

```bash
# 사용 중인 포트 확인 및 종료
npm run kill:ports

# 또는 수동으로
lsof -ti:3000,5173,5174,5175,5432,6379 | xargs kill -9
```

### 4. 컨테이너가 시작되지 않음

**증상**: 컨테이너가 계속 재시작되거나 종료됨

**해결방법:**

```bash
# 로그 확인
docker-compose -f docker-compose.dev.yml logs <service-name>

# 헬스체크 상태 확인
docker inspect roomservation-dev-postgres | grep -A 10 Health
```

### 5. 데이터베이스 연결 실패

**증상**: `FATAL: database "roomservation" does not exist`

**해결방법:**

```bash
# PostgreSQL 헬스체크 확인
docker-compose -f docker-compose.dev.yml ps postgres

# 수동으로 데이터베이스 생성
docker exec -it roomservation-dev-postgres psql -U admin -c "CREATE DATABASE roomservation;"
```

### 6. 프론트엔드 빌드 오류

**증상**: `Module not found` 또는 의존성 오류

**해결방법:**

```bash
# node_modules 재설치
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml build --no-cache user-web admin-web kiosk-web
docker-compose -f docker-compose.dev.yml up -d
```

### 7. Hot Reload가 작동하지 않음

**증상**: 코드 변경이 반영되지 않음

**해결방법:**

```bash
# 볼륨 마운트 확인
docker inspect roomservation-dev-api | grep -A 10 Mounts

# WSL2 환경에서 파일 시스템 문제 가능성
# → 프로젝트를 WSL 파일시스템으로 이동 (예: /home/username/projects)
```

### 8. 메모리 부족

**증상**: 컨테이너가 느리거나 종료됨

**해결방법:**

- Docker Desktop 설정에서 메모리 할당량 증가 (최소 4GB 권장)
- Settings → Resources → Advanced → Memory

### 9. Docker Desktop이 WSL2를 인식하지 못함

**해결방법:**

1. Docker Desktop Settings → General
2. "Use the WSL 2 based engine" 체크 확인
3. Settings → Resources → WSL Integration
4. Ubuntu 배포판 활성화
5. "Apply & Restart"

### 10. 완전 초기화

모든 것을 처음부터 다시 시작:

```bash
# 모든 컨테이너, 볼륨, 네트워크 제거
npm run docker:dev:clean

# 또는 수동으로
docker-compose -f docker-compose.dev.yml down -v --remove-orphans

# Docker 이미지 제거
docker rmi $(docker images -q 'roomservation-dev*')

# 재빌드 및 시작
npm run docker:dev:build
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
4. **E2E 테스트 실행**: [테스트 가이드](./README.TESTING.md) 참고

---

## 참고 자료

- [Docker Compose 문서](https://docs.docker.com/compose/)
- [프로덕션 배포 가이드](./README.DEPLOYMENT.md)
- [프로젝트 README](./README.md)
- [테스트 가이드](./README.TESTING.md)

---

**마지막 업데이트:** 2025-10-12
