# 배포 가이드

이 문서는 Room Reservation API를 프로덕션 환경에 배포하는 방법을 설명합니다.

## 📋 목차

1. [배포 개요](#배포-개요)
2. [사전 요구사항](#사전-요구사항)
3. [Docker 프로덕션 배포](#docker-프로덕션-배포)
4. [ipTIME DDNS 배포 (자택/사무실)](#iptime-ddns-배포-자택사무실)
5. [데이터베이스 프로덕션 설정](#데이터베이스-프로덕션-설정)
6. [HTTPS 설정 (SSL/TLS)](#https-설정-ssltls)
7. [보안 설정](#보안-설정)
8. [모니터링 및 유지보수](#모니터링-및-유지보수)
9. [트러블슈팅](#트러블슈팅)
10. [배포 체크리스트](#배포-체크리스트)

---

## 배포 개요

본 서비스는 Docker Compose를 사용하여 다음 두 가지 배포 시나리오를 지원합니다:

1. **클라우드 배포**: AWS, GCP, Azure 등의 클라우드 서비스
2. **자택/사무실 배포**: ipTIME DDNS를 활용한 로컬 서버 배포

---

## 사전 요구사항

### 필수 도구

- **Docker** 20.10 이상
- **Docker Compose** v2.0 이상

### 시스템 요구사항

- CPU: 2코어 이상
- RAM: 4GB 이상 (권장 8GB)
- 저장공간: 20GB 이상
- OS: Ubuntu 20.04/22.04 LTS (권장), Windows with WSL2, 또는 macOS

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

## Docker 프로덕션 배포

### 1. 환경 변수 설정

프로덕션 환경 변수를 설정합니다:

```bash
# .env.production 파일 생성 (이미 생성됨)
# 다음 항목들을 반드시 수정하세요:
```

**⚠️ 중요: 프로덕션 환경에서 반드시 변경해야 할 항목:**

```env
# Server
PORT=3000
NODE_ENV=production

# Database 보안 설정
DB_TYPE=postgres
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=secure_username
DB_PASSWORD=secure_strong_password_here
DB_DATABASE=roomservation

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT 시크릿 키 (강력한 랜덤 문자열로 변경)
JWT_ACCESS_SECRET=CHANGE_THIS_TO_A_SECURE_RANDOM_STRING_FOR_PRODUCTION_ACCESS_TOKEN
JWT_REFRESH_SECRET=CHANGE_THIS_TO_A_SECURE_RANDOM_STRING_FOR_PRODUCTION_REFRESH_TOKEN
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS 설정 (실제 프론트엔드 도메인으로 변경)
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100
```

### 2. 강력한 시크릿 키 생성

```bash
# 랜덤 시크릿 키 생성
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 또는
openssl rand -hex 64
```

### 3. 빌드 및 실행

#### 전체 스택 실행

```bash
# 모든 서비스 빌드 및 실행
docker compose --env-file .env.production up -d --build

# 로그 확인
docker compose logs -f

# 특정 서비스 로그만 확인
docker compose logs -f api
```

#### 개별 서비스 빌드

```bash
# API 서버만 빌드
docker compose build api

# PostgreSQL과 Redis만 실행
docker compose up -d postgres redis

# API 서버 실행 (의존성 자동 시작)
docker compose up -d api
```

#### 프로덕션 빌드 최적화

```bash
# 캐시 없이 완전히 새로 빌드
docker compose build --no-cache api

# 병렬 빌드 (더 빠름)
docker compose build --parallel
```

### 4. Docker 이미지 구조

#### Multi-stage Build

Dockerfile은 2단계 빌드로 구성되어 이미지 크기를 최소화합니다:

**Stage 1: Builder**
- Node.js 20 Alpine 이미지
- 모든 의존성 설치 (dev 포함)
- TypeScript 빌드 실행
- 결과: `dist/` 폴더

**Stage 2: Production**
- Node.js 20 Alpine 이미지
- 프로덕션 의존성만 설치
- 빌드된 파일만 복사
- Non-root 사용자로 실행 (보안)
- dumb-init으로 프로세스 관리

#### 보안 특징

1. **Non-root 사용자**: `nestjs` 사용자로 실행
2. **최소 권한 원칙**: 필요한 파일만 포함
3. **Alpine Linux**: 경량 베이스 이미지
4. **Signal Handling**: dumb-init으로 안전한 종료

### 5. 컨테이너 관리

#### 상태 확인

```bash
# 실행 중인 컨테이너 확인
docker compose ps

# 컨테이너 상세 정보
docker compose ps --format json | jq

# 헬스체크 상태 확인
docker inspect roomservation-api | jq '.[0].State.Health'
```

#### 서비스 제어

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

#### 로그 관리

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

### 6. 네트워크

#### 서비스 간 통신

모든 서비스는 `roomservation-network` 브리지 네트워크에 연결됩니다:

- **postgres**: `postgres:5432`
- **redis**: `redis:6379`
- **api**: `api:3000`

#### 외부 접속

- **API**: `http://localhost:3000`
- **Swagger**: `http://localhost:3000/api-docs`
- **PostgreSQL**: `localhost:5432`
- **Redis**: `localhost:6379`

### 7. 성능 최적화

#### 리소스 제한 설정

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

#### 빌드 캐시 활용

```bash
# BuildKit 활성화 (더 빠른 빌드)
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

docker compose build
```

---

## ipTIME DDNS 배포 (자택/사무실)

ipTIME 공유기의 DDNS 기능을 활용하여 자택/사무실 서버에 배포하는 방법입니다.

### 1. ipTIME 공유기 설정

#### 1.1 DDNS 설정

```
1. 브라우저에서 http://192.168.0.1 접속
2. 관리자 계정으로 로그인
3. 경로: 관리도구 > 고급설정 > 특수기능 > DDNS 설정
4. 호스트 이름 입력: yourname.iptime.org
5. [등록] 클릭
6. 등록 성공 확인
```

**예시 DDNS 주소:**
- `myroom.iptime.org`
- `roomservice.iptime.org`

#### 1.2 DDNS 주소 확인

```bash
# 터미널에서 확인
nslookup yourname.iptime.org

# 결과: 공인 IP 주소가 표시되어야 함
```

### 2. 포트포워딩 설정

#### 2.1 서버 PC 내부 IP 고정

```
경로: 관리도구 > 고급설정 > NAT/라우터 관리 > 내부 네트워크 설정

1. DHCP 서버 설정
2. 서버 PC MAC 주소 찾기
3. 고정 IP 할당 (예: 192.168.0.100)
4. [적용] 클릭
```

**서버 MAC 주소 확인 방법:**

```bash
# Linux/Mac
ip addr show | grep ether

# Windows
ipconfig /all
```

#### 2.2 포트포워딩 규칙 추가

```
경로: 관리도구 > 고급설정 > NAT/라우터 관리 > 포트포워드 설정

규칙 1 - HTTP
- 규칙 이름: RoomAPI_HTTP
- 외부 포트: 80
- 내부 IP: 192.168.0.100 (서버 PC IP)
- 내부 포트: 80
- 프로토콜: TCP

규칙 2 - HTTPS
- 규칙 이름: RoomAPI_HTTPS
- 외부 포트: 443
- 내부 IP: 192.168.0.100
- 내부 포트: 443
- 프로토콜: TCP

규칙 3 - API (개발/테스트용, 선택사항)
- 규칙 이름: RoomAPI_Direct
- 외부 포트: 3000
- 내부 IP: 192.168.0.100
- 내부 포트: 3000
- 프로토콜: TCP

[적용] 클릭
```

#### 2.3 포트포워딩 테스트

```bash
# 외부에서 접속 테스트 (모바일 핫스팟 등 다른 네트워크)
curl http://yourname.iptime.org:3000
```

### 3. 서버 환경 구성

#### 3.1 Docker 설치 (Ubuntu)

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

#### 3.2 프로젝트 배포

```bash
# 홈 디렉토리에 배포 폴더 생성
mkdir -p ~/roomservation
cd ~/roomservation

# Git에서 프로젝트 클론
git clone https://github.com/your-username/roomservation.git .
```

#### 3.3 환경 변수 설정 (DDNS용)

```env
# .env.production
# Server
PORT=3000
NODE_ENV=production

# Database
DB_TYPE=postgres
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=roomadmin
DB_PASSWORD=STRONG_PASSWORD_HERE_123!@#
DB_DATABASE=roomservation

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# JWT - 반드시 변경!
JWT_ACCESS_SECRET=your_very_long_random_access_secret_key_min_32_chars
JWT_REFRESH_SECRET=your_very_long_random_refresh_secret_key_min_32_chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS - DDNS 주소로 변경
CORS_ORIGIN=https://yourname.iptime.org,http://yourname.iptime.org

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100
```

### 4. 서비스 자동 시작 설정

```bash
# Docker 서비스 자동 시작
sudo systemctl enable docker

# 시스템 재부팅 시 Docker Compose 자동 실행
crontab -e

# 다음 줄 추가:
@reboot cd /home/username/roomservation && docker-compose --env-file .env.production up -d
```

---

## 데이터베이스 프로덕션 설정

### 1. 마이그레이션 (프로덕션 권장)

프로덕션 환경에서는 `synchronize: false`로 설정하고 마이그레이션을 사용하세요:

```bash
# 마이그레이션 파일 생성
npm run migration:generate -- src/database/migrations/InitialSchema

# 마이그레이션 실행
npm run migration:run

# 마이그레이션 롤백
npm run migration:revert
```

### 2. 데이터베이스 접속

```bash
# PostgreSQL 컨테이너 접속
docker exec -it roomservation-postgres psql -U postgres -d roomservation

# Redis 컨테이너 접속
docker exec -it roomservation-redis redis-cli
```

### 3. 데이터베이스 백업

```bash
# 백업 생성
docker exec roomservation-postgres pg_dump -U postgres roomservation > backup.sql

# 백업 복원
docker exec -i roomservation-postgres psql -U postgres roomservation < backup.sql
```

#### 자동 백업 스크립트

```bash
# 백업 스크립트 생성
nano ~/backup-db.sh
```

```bash
#!/bin/bash
# backup-db.sh

BACKUP_DIR=~/roomservation/backups
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="roomservation_backup_${DATE}.sql"

# 백업 디렉토리 생성
mkdir -p ${BACKUP_DIR}

# PostgreSQL 백업
docker exec roomservation-postgres pg_dump -U roomadmin roomservation > ${BACKUP_DIR}/${BACKUP_FILE}

# 압축
gzip ${BACKUP_DIR}/${BACKUP_FILE}

# 7일 이상 된 백업 삭제
find ${BACKUP_DIR} -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: ${BACKUP_FILE}.gz"
```

```bash
# 실행 권한 부여
chmod +x ~/backup-db.sh

# 크론탭 설정 (매일 새벽 3시)
crontab -e

# 다음 줄 추가:
0 3 * * * /home/username/backup-db.sh >> /home/username/backup.log 2>&1
```

---

## HTTPS 설정 (SSL/TLS)

### Nginx Reverse Proxy + Let's Encrypt (권장)

#### 1. Nginx 설치

```bash
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx -y
```

#### 2. Nginx 설정

```bash
# Nginx 설정 파일 생성
sudo nano /etc/nginx/sites-available/roomservation
```

```nginx
# /etc/nginx/sites-available/roomservation

# HTTP -> HTTPS 리다이렉트
server {
    listen 80;
    server_name yourname.iptime.org;

    location / {
        return 301 https://$server_name$request_uri;
    }

    # Let's Encrypt 인증용
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
}

# HTTPS
server {
    listen 443 ssl http2;
    server_name yourname.iptime.org;

    # SSL 인증서 경로 (certbot이 자동 설정)
    ssl_certificate /etc/letsencrypt/live/yourname.iptime.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourname.iptime.org/privkey.pem;

    # SSL 설정
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # 보안 헤더
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # API 프록시
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # WebSocket 지원
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # 파일 업로드 크기 제한
    client_max_body_size 10M;

    # 타임아웃 설정
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
}
```

#### 3. Nginx 활성화

```bash
# 심볼릭 링크 생성
sudo ln -s /etc/nginx/sites-available/roomservation /etc/nginx/sites-enabled/

# 기본 사이트 비활성화 (선택사항)
sudo rm /etc/nginx/sites-enabled/default

# 설정 테스트
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx
```

#### 4. SSL 인증서 발급 (Let's Encrypt)

```bash
# Certbot으로 SSL 인증서 발급
sudo certbot --nginx -d yourname.iptime.org

# 인증서 자동 갱신 설정 (90일마다)
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# 갱신 테스트
sudo certbot renew --dry-run
```

#### 5. HTTPS 접속 확인

```bash
# 로컬에서 테스트
curl https://yourname.iptime.org

# Swagger 문서
# https://yourname.iptime.org/api-docs
```

---

## 보안 설정

### 1. 방화벽 설정 (UFW)

```bash
# UFW 설치 및 활성화
sudo apt install ufw -y

# 기본 정책 설정
sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH 포트 허용 (원격 접속용)
sudo ufw allow 22/tcp

# HTTP/HTTPS 허용
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 방화벽 활성화
sudo ufw enable

# 상태 확인
sudo ufw status verbose
```

### 2. Docker 컨테이너 보안

```bash
# docker-compose.yml에서 외부에서 직접 접근 불필요한 포트는 expose만 사용

# 예시:
# postgres:
#   expose:
#     - "5432"  # 외부 포트 매핑 제거, 내부 네트워크만
```

### 3. 환경 변수 파일 보안

```bash
# .env.production 권한 설정
chmod 600 .env.production

# 소유자만 읽기/쓰기 가능
ls -l .env.production
# -rw------- 1 user user 1234 Oct 12 12:00 .env.production
```

### 4. Fail2Ban 설정 (무차별 대입 공격 방어)

```bash
# Fail2Ban 설치
sudo apt install fail2ban -y

# Nginx용 jail 설정
sudo nano /etc/fail2ban/jail.local
```

```ini
# /etc/fail2ban/jail.local
[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
```

```bash
# Fail2Ban 재시작
sudo systemctl restart fail2ban

# 상태 확인
sudo fail2ban-client status
```

---

## 모니터링 및 유지보수

### 1. 로그 관리

```bash
# 실시간 로그 모니터링
docker-compose logs -f

# 최근 100줄만 보기
docker-compose logs --tail=100

# 특정 서비스만
docker-compose logs -f api
```

#### 로그 로테이션 설정

```bash
sudo nano /etc/docker/daemon.json
```

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

```bash
# Docker 재시작
sudo systemctl restart docker
```

### 2. 시스템 리소스 모니터링

```bash
# Docker 컨테이너 리소스 사용량
docker stats

# 디스크 사용량
df -h

# 메모리 사용량
free -h

# CPU 사용량
top
```

### 3. 정기적인 보안 업데이트

```bash
# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# Docker 이미지 업데이트
cd ~/roomservation
docker-compose pull
docker-compose --env-file .env.production up -d --build

# 사용하지 않는 Docker 리소스 정리
docker system prune -a
```

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

# 환경 변수 확인
docker-compose config | grep DB_
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

### 6. DDNS 주소로 접속이 안 될 때

```bash
# 1. 포트포워딩 확인
# ipTIME 관리 페이지에서 포트포워딩 규칙 재확인

# 2. 공인 IP 확인
curl ifconfig.me
nslookup yourname.iptime.org
# 두 IP가 일치해야 함

# 3. 방화벽 확인
sudo ufw status

# 4. Docker 컨테이너 확인
docker-compose ps
docker-compose logs api

# 5. Nginx 확인 (사용 시)
sudo systemctl status nginx
sudo nginx -t
```

### 7. SSL 인증서 발급 실패

```bash
# 1. 80 포트가 열려있는지 확인
sudo netstat -tlnp | grep :80

# 2. Nginx 설정 확인
sudo nginx -t

# 3. DNS가 제대로 설정되었는지 확인
nslookup yourname.iptime.org

# 4. Certbot 로그 확인
sudo tail -f /var/log/letsencrypt/letsencrypt.log

# 5. 수동으로 재시도
sudo certbot --nginx -d yourname.iptime.org --force-renewal
```

---

## 배포 체크리스트

### 배포 전

- [ ] `.env.production` 파일의 모든 시크릿 키 변경
- [ ] 강력한 데이터베이스 비밀번호 설정
- [ ] CORS 오리진을 실제 도메인으로 설정
- [ ] JWT 시크릿을 강력한 랜덤 문자열로 변경
- [ ] 데이터베이스 백업 전략 수립
- [ ] SSL/TLS 인증서 설정 계획 수립
- [ ] 리소스 제한 설정 검토

### 배포 중

- [ ] Docker 이미지 빌드 성공
- [ ] 모든 컨테이너 정상 실행
- [ ] 헬스체크 통과
- [ ] 로컬 접속 테스트 성공
- [ ] 로그 레벨 프로덕션 모드로 설정

### 배포 후

- [ ] 외부 접속 테스트 성공 (DDNS 또는 도메인)
- [ ] HTTPS 설정 완료
- [ ] API 문서 접근 가능 확인
- [ ] 데이터베이스 백업 스크립트 설정
- [ ] 로그 모니터링 설정
- [ ] 보안 업데이트 스케줄 설정
- [ ] 방화벽 설정 완료
- [ ] 모니터링 및 알림 설정

---

## 다음 단계

1. **CI/CD 파이프라인**
   - GitHub Actions
   - 자동 빌드 및 배포
   - 자동화된 테스트

2. **모니터링**
   - Prometheus + Grafana
   - 로그 수집 (ELK Stack)
   - APM (Application Performance Monitoring)

3. **스케일링**
   - Kubernetes로 마이그레이션
   - 수평적 확장
   - 고가용성 구성

---

**마지막 업데이트:** 2025-10-12
