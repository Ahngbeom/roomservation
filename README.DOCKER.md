# Docker 프로덕션 배포 가이드

이 문서는 Docker를 사용하여 방 예약 서비스 API를 프로덕션 환경에 배포하는 방법을 설명합니다.

## 📋 목차

1. [사전 요구사항](#사전-요구사항)
2. [환경 설정](#환경-설정)
3. [빌드 및 실행](#빌드-및-실행)
4. [컨테이너 관리](#컨테이너-관리)
5. [트러블슈팅](#트러블슈팅)

---

## 사전 요구사항

### 필수 도구

- Docker 20.10 이상
- Docker Compose v2.0 이상

### WSL2 환경 (Windows)

1. Docker Desktop 실행
2. WSL2 통합 활성화 확인:
   - Docker Desktop → Settings → Resources → WSL Integration
   - 사용 중인 WSL 배포판 활성화

### 권한 문제 해결 (Linux)

```bash
# Docker 그룹에 사용자 추가
sudo usermod -aG docker $USER

# 로그아웃 후 다시 로그인
```

---

## 환경 설정

### 1. 환경 변수 파일 생성

프로덕션 환경 변수를 설정합니다:

```bash
# .env.production 파일 생성 (이미 생성됨)
# 다음 항목들을 반드시 수정하세요:
```

**⚠️ 중요: 프로덕션 환경에서 반드시 변경해야 할 항목:**

```env
# Database 보안 설정
DB_USERNAME=secure_username
DB_PASSWORD=secure_strong_password_here

# JWT 시크릿 키 (강력한 랜덤 문자열로 변경)
JWT_ACCESS_SECRET=CHANGE_THIS_TO_A_SECURE_RANDOM_STRING_FOR_PRODUCTION_ACCESS_TOKEN
JWT_REFRESH_SECRET=CHANGE_THIS_TO_A_SECURE_RANDOM_STRING_FOR_PRODUCTION_REFRESH_TOKEN

# CORS 설정 (실제 프론트엔드 도메인으로 변경)
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

### 2. 강력한 시크릿 키 생성

```bash
# 랜덤 시크릿 키 생성
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 또는
openssl rand -hex 64
```

---

## 빌드 및 실행

### 전체 스택 실행

```bash
# 모든 서비스 빌드 및 실행
docker compose --env-file .env.production up -d --build

# 로그 확인
docker compose logs -f

# 특정 서비스 로그만 확인
docker compose logs -f api
```

### 개별 서비스 빌드

```bash
# API 서버만 빌드
docker compose build api

# PostgreSQL과 Redis만 실행
docker compose up -d postgres redis

# API 서버 실행 (의존성 자동 시작)
docker compose up -d api
```

### 프로덕션 빌드 최적화

```bash
# 캐시 없이 완전히 새로 빌드
docker compose build --no-cache api

# 병렬 빌드 (더 빠름)
docker compose build --parallel
```

---

## Docker 이미지 구조

### Multi-stage Build

Dockerfile은 2단계 빌드로 구성되어 이미지 크기를 최소화합니다:

**Stage 1: Builder**

- Node.js 18 Alpine 이미지
- 모든 의존성 설치 (dev 포함)
- TypeScript 빌드 실행
- 결과: `dist/` 폴더

**Stage 2: Production**

- Node.js 18 Alpine 이미지
- 프로덕션 의존성만 설치
- 빌드된 파일만 복사
- Non-root 사용자로 실행 (보안)
- dumb-init으로 프로세스 관리

### 보안 특징

1. **Non-root 사용자**: `nestjs` 사용자로 실행
2. **최소 권한 원칙**: 필요한 파일만 포함
3. **Alpine Linux**: 경량 베이스 이미지
4. **Signal Handling**: dumb-init으로 안전한 종료

---

## 컨테이너 관리

### 상태 확인

```bash
# 실행 중인 컨테이너 확인
docker compose ps

# 컨테이너 상세 정보
docker compose ps --format json | jq

# 헬스체크 상태 확인
docker inspect roomservation-api | jq '.[0].State.Health'
```

### 서비스 제어

```bash
# 특정 서비스 재시작
docker compose restart api

# 서비스 중지
docker compose stop

# 서비스 중지 및 컨테이너 삭제
docker compose down

# 볼륨까지 삭제 (주의!)
docker compose down -v
```

### 로그 관리

```bash
# 전체 로그 확인
docker compose logs

# 실시간 로그 (tail -f)
docker compose logs -f api

# 최근 100줄만 확인
docker compose logs --tail=100 api

# 타임스탬프 포함
docker compose logs -t api
```

### 데이터베이스 접속

```bash
# PostgreSQL 컨테이너 접속
docker exec -it roomservation-postgres psql -U postgres -d roomservation

# Redis 컨테이너 접속
docker exec -it roomservation-redis redis-cli

# 데이터베이스 백업
docker exec roomservation-postgres pg_dump -U postgres roomservation > backup.sql

# 데이터베이스 복원
docker exec -i roomservation-postgres psql -U postgres roomservation < backup.sql
```

---

## 성능 최적화

### 리소스 제한 설정

`docker-compose.yml`에 리소스 제한 추가:

```yaml
services:
  api:
    # ...
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### 빌드 캐시 활용

```bash
# BuildKit 활성화 (더 빠른 빌드)
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

docker compose build
```

---

## 네트워크

### 서비스 간 통신

모든 서비스는 `roomservation-network` 브리지 네트워크에 연결됩니다:

- **postgres**: `postgres:5432`
- **redis**: `redis:6379`
- **api**: `api:3000`

### 외부 접속

- **API**: `http://localhost:3000`
- **Swagger**: `http://localhost:3000/api-docs`
- **PostgreSQL**: `localhost:5432`
- **Redis**: `localhost:6379`

---

## 트러블슈팅

### 1. Docker 데몬 연결 실패

**문제**: `permission denied while trying to connect to the Docker daemon socket`

**해결방법 (WSL2)**:

```bash
# Docker Desktop이 실행 중인지 확인
# Windows에서 Docker Desktop 실행

# WSL2 통합 확인
# Docker Desktop → Settings → Resources → WSL Integration
```

**해결방법 (Linux)**:

```bash
# Docker 서비스 시작
sudo systemctl start docker

# 사용자를 docker 그룹에 추가
sudo usermod -aG docker $USER
newgrp docker
```

### 2. 빌드 실패

**문제**: `npm ci` 또는 빌드 오류

**해결방법**:

```bash
# 캐시 없이 다시 빌드
docker compose build --no-cache api

# 이전 이미지 정리
docker system prune -a
```

### 3. 컨테이너 시작 실패

**문제**: 컨테이너가 계속 재시작됨

**해결방법**:

```bash
# 로그 확인
docker compose logs api

# 헬스체크 실패 원인 확인
docker inspect roomservation-api | jq '.[0].State.Health'

# 컨테이너 내부 접속
docker exec -it roomservation-api sh
```

### 4. 데이터베이스 연결 실패

**문제**: API가 PostgreSQL에 연결할 수 없음

**해결방법**:

```bash
# PostgreSQL 헬스체크 확인
docker compose ps postgres

# 데이터베이스 로그 확인
docker compose logs postgres

# 네트워크 연결 테스트
docker exec roomservation-api ping postgres
```

### 5. 포트 충돌

**문제**: `port is already allocated`

**해결방법**:

```bash
# 포트 사용 중인 프로세스 확인
sudo lsof -i :3000
sudo lsof -i :5432

# .env.production에서 다른 포트 사용
PORT=3001
DB_PORT=5433
```

### 6. 메모리 부족

**문제**: 빌드 중 메모리 부족 오류

**해결방법**:

```bash
# Docker Desktop 메모리 증가
# Settings → Resources → Memory (4GB 이상 권장)

# 스왑 메모리 활성화
docker info | grep -i memory
```

---

## 배포 체크리스트

프로덕션 배포 전 확인사항:

- [ ] `.env.production` 파일의 모든 시크릿 키 변경
- [ ] 강력한 데이터베이스 비밀번호 설정
- [ ] CORS 오리진을 실제 도메인으로 설정
- [ ] JWT 시크릿을 강력한 랜덤 문자열로 변경
- [ ] 헬스체크 엔드포인트 정상 작동 확인
- [ ] 로그 레벨 프로덕션 모드로 설정
- [ ] 데이터베이스 백업 전략 수립
- [ ] SSL/TLS 인증서 설정 (리버스 프록시)
- [ ] 리소스 제한 설정
- [ ] 모니터링 및 알림 설정

---

## 다음 단계

1. **리버스 프록시 설정** (Nginx/Traefik)
   - SSL/TLS 인증서 자동 관리
   - 로드 밸런싱
   - Rate limiting

2. **CI/CD 파이프라인**
   - GitHub Actions
   - 자동 빌드 및 배포
   - 자동화된 테스트

3. **모니터링**
   - Prometheus + Grafana
   - 로그 수집 (ELK Stack)
   - APM (Application Performance Monitoring)

4. **스케일링**
   - Kubernetes로 마이그레이션
   - 수평적 확장
   - 고가용성 구성
