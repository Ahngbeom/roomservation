# ipTIME DDNS를 사용한 서버 배포 가이드

이 문서는 ipTIME 공유기의 DDNS 기능을 활용하여 자택/사무실 서버에 Room Reservation API를 배포하는 방법을 설명합니다.

## 📋 목차

1. [사전 요구사항](#사전-요구사항)
2. [ipTIME 공유기 설정](#iptime-공유기-설정)
3. [서버 환경 구성](#서버-환경-구성)
4. [Docker 배포](#docker-배포)
5. [HTTPS 설정 (SSL/TLS)](#https-설정-ssltls)
6. [보안 설정](#보안-설정)
7. [모니터링 및 유지보수](#모니터링-및-유지보수)
8. [트러블슈팅](#트러블슈팅)

---

## 사전 요구사항

### 하드웨어 요구사항

- **서버 PC/NAS**
  - CPU: 2코어 이상
  - RAM: 4GB 이상 (권장 8GB)
  - 저장공간: 20GB 이상
  - OS: Ubuntu 20.04/22.04 LTS (권장) 또는 Windows with WSL2

- **네트워크**
  - ipTIME 공유기 (DDNS 지원 모델)
  - 고정 IP 할당 가능한 환경
  - 인터넷 연결 (업로드 속도 10Mbps 이상 권장)

### 소프트웨어 요구사항

```bash
# 확인 명령어
docker --version          # Docker 20.10 이상
docker-compose --version  # Docker Compose 2.0 이상
```

---

## ipTIME 공유기 설정

### 1. DDNS 설정

#### 1.1 ipTIME 관리자 페이지 접속

```
1. 브라우저에서 http://192.168.0.1 접속
2. 관리자 계정으로 로그인
```

#### 1.2 DDNS 등록

```
경로: 관리도구 > 고급설정 > 특수기능 > DDNS 설정

1. [DDNS 설정] 클릭
2. 호스트 이름 입력: yourname.iptime.org
3. [등록] 클릭
4. 등록 성공 확인
```

**예시 DDNS 주소:**

- `myroom.iptime.org`
- `roomservice.iptime.org`

#### 1.3 DDNS 주소 확인

```bash
# 터미널에서 확인
nslookup yourname.iptime.org

# 결과 예시:
# Server:  8.8.8.8
# Address:  8.8.8.8
#
# Non-authoritative answer:
# Name:    yourname.iptime.org
# Address:  123.456.789.012  <- 공인 IP
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
ifconfig | grep ether

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

---

## 서버 환경 구성

### 1. Docker 설치 (Ubuntu)

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

### 2. 프로젝트 배포 디렉토리 생성

```bash
# 홈 디렉토리에 배포 폴더 생성
mkdir -p ~/roomservation
cd ~/roomservation

# Git에서 프로젝트 클론
git clone https://github.com/your-username/roomservation.git .

# 또는 파일 직접 업로드 (SCP, SFTP 등)
```

### 3. 환경 변수 설정

```bash
# .env.production 파일 생성
nano .env.production
```

**.env.production 설정:**

```env
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
REDIS_PASSWORD=

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

**강력한 비밀키 생성:**

```bash
# JWT 시크릿 생성 (64자리 랜덤 문자열)
openssl rand -hex 64

# 또는
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Docker 배포

### 1. Docker Compose 설정 수정

`docker-compose.yml` 파일을 수정하여 재시작 정책과 볼륨을 추가합니다.

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: roomservation-postgres
    environment:
      POSTGRES_USER: ${DB_USERNAME}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_DATABASE}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups  # 백업 폴더 마운트
    ports:
      - "5432:5432"
    restart: always  # 항상 재시작
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB']
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - roomservation-network

  redis:
    image: redis:7-alpine
    container_name: roomservation-redis
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: always
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - roomservation-network

  api:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    container_name: roomservation-api
    environment:
      - NODE_ENV=${NODE_ENV}
      - PORT=${PORT}
      - DB_TYPE=${DB_TYPE}
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_USERNAME=${DB_USERNAME}
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_DATABASE=${DB_DATABASE}
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_PASSWORD=${REDIS_PASSWORD}
      - JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - JWT_ACCESS_EXPIRES_IN=${JWT_ACCESS_EXPIRES_IN}
      - JWT_REFRESH_EXPIRES_IN=${JWT_REFRESH_EXPIRES_IN}
      - CORS_ORIGIN=${CORS_ORIGIN}
      - RATE_LIMIT_TTL=${RATE_LIMIT_TTL}
      - RATE_LIMIT_MAX=${RATE_LIMIT_MAX}
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: always
    networks:
      - roomservation-network
    healthcheck:
      test: ['CMD', 'wget', '--quiet', '--tries=1', '--spider', 'http://localhost:3000/']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  postgres_data:
  redis_data:

networks:
  roomservation-network:
    driver: bridge
```

### 2. 빌드 및 실행

```bash
# .env.production 파일 사용하여 빌드 및 실행
docker-compose --env-file .env.production up -d --build

# 로그 확인
docker-compose logs -f

# 특정 컨테이너 로그만 보기
docker-compose logs -f api

# 상태 확인
docker-compose ps
```

### 3. 배포 확인

```bash
# API 헬스체크 (로컬)
curl http://localhost:3000

# Swagger 문서 확인 (로컬)
curl http://localhost:3000/api-docs

# DDNS로 외부 접속 테스트 (다른 네트워크에서)
curl http://yourname.iptime.org:3000
```

---

## HTTPS 설정 (SSL/TLS)

### 방법 1: Nginx Reverse Proxy + Let's Encrypt (권장)

#### 1.1 Nginx 설치

```bash
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx -y
```

#### 1.2 Nginx 설정

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

#### 1.3 Nginx 활성화

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

#### 1.4 SSL 인증서 발급 (Let's Encrypt)

```bash
# Certbot으로 SSL 인증서 발급
sudo certbot --nginx -d yourname.iptime.org

# 프롬프트에서:
# - 이메일 입력
# - 약관 동의 (Y)
# - 뉴스레터 수신 선택 (선택사항)
# - HTTPS 리다이렉트 설정 (권장: 2번 선택)

# 인증서 자동 갱신 설정 (90일마다)
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# 갱신 테스트
sudo certbot renew --dry-run
```

#### 1.5 HTTPS 접속 확인

```bash
# 로컬에서 테스트
curl https://yourname.iptime.org

# Swagger 문서
# https://yourname.iptime.org/api-docs
```

### 방법 2: Traefik (Docker 기반, 고급)

Traefik을 사용하면 Docker와 통합되어 자동으로 SSL을 관리할 수 있습니다.

```yaml
# docker-compose.traefik.yml (참고용)
version: '3.8'

services:
  traefik:
    image: traefik:v2.10
    container_name: traefik
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
      - "--certificatesresolvers.letsencrypt.acme.email=your-email@example.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"  # Traefik 대시보드
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./letsencrypt:/letsencrypt
    networks:
      - roomservation-network
    restart: always

  # API 서비스에 Traefik 라벨 추가
  api:
    # ... 기존 설정 ...
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(`yourname.iptime.org`)"
      - "traefik.http.routers.api.entrypoints=websecure"
      - "traefik.http.routers.api.tls.certresolver=letsencrypt"
      - "traefik.http.services.api.loadbalancer.server.port=3000"
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

# API 포트 (개발용, 선택사항)
# sudo ufw allow 3000/tcp

# 방화벽 활성화
sudo ufw enable

# 상태 확인
sudo ufw status verbose
```

### 2. Docker 컨테이너 보안

```bash
# 불필요한 포트 노출 제거
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

### 4. 정기적인 보안 업데이트

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

### 5. Fail2Ban 설정 (무차별 대입 공격 방어)

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

# 로그 파일 로테이션 설정
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

### 2. 데이터베이스 백업

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

### 3. 시스템 리소스 모니터링

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

## 트러블슈팅

### 1. DDNS 주소로 접속이 안 될 때

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

### 2. SSL 인증서 발급 실패

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

### 3. 데이터베이스 연결 오류

```bash
# 1. PostgreSQL 컨테이너 상태 확인
docker-compose ps postgres

# 2. 컨테이너 로그 확인
docker-compose logs postgres

# 3. 직접 접속 테스트
docker exec -it roomservation-postgres psql -U roomadmin -d roomservation

# 4. 환경 변수 확인
docker-compose config | grep DB_
```

### 4. 메모리 부족 문제

```bash
# 1. 현재 메모리 사용량 확인
free -h

# 2. Docker 컨테이너별 메모리 사용량
docker stats --no-stream

# 3. Swap 메모리 추가 (4GB 예시)
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 4. 메모리 제한 설정 (docker-compose.yml)
# services:
#   api:
#     mem_limit: 1g
```

### 5. 서비스 재시작

```bash
# Docker 컨테이너 재시작
docker-compose restart

# 특정 서비스만
docker-compose restart api

# 완전히 다시 시작
docker-compose down
docker-compose --env-file .env.production up -d

# 이미지 다시 빌드
docker-compose down
docker-compose --env-file .env.production up -d --build
```

---

## 📝 배포 체크리스트

### 배포 전

- [ ] DDNS 등록 및 테스트 완료
- [ ] 포트포워딩 설정 완료
- [ ] 서버 PC 내부 IP 고정
- [ ] Docker 및 Docker Compose 설치
- [ ] .env.production 파일 생성 및 비밀키 변경
- [ ] 방화벽 설정 완료

### 배포 중

- [ ] Docker 이미지 빌드 성공
- [ ] 모든 컨테이너 정상 실행
- [ ] 헬스체크 통과
- [ ] 로컬 접속 테스트 성공

### 배포 후

- [ ] DDNS로 외부 접속 테스트 성공
- [ ] HTTPS 설정 완료 (SSL 인증서 발급)
- [ ] API 문서 접근 가능
- [ ] 데이터베이스 백업 스크립트 설정
- [ ] 로그 모니터링 설정
- [ ] 보안 업데이트 스케줄 설정

---

## 🚀 성능 최적화 팁

### 1. Redis 메모리 최적화

```bash
# docker-compose.yml의 redis 서비스에 추가
redis:
  command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
```

### 2. PostgreSQL 튜닝

```bash
# PostgreSQL 컨테이너에 접속
docker exec -it roomservation-postgres psql -U roomadmin -d roomservation

-- 연결 수 제한 설정
ALTER SYSTEM SET max_connections = 100;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';

-- 재시작
docker-compose restart postgres
```

### 3. Nginx 캐싱 설정

```nginx
# /etc/nginx/sites-available/roomservation에 추가
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=1g inactive=60m;

server {
    # ... 기존 설정 ...

    location /api/ {
        proxy_cache api_cache;
        proxy_cache_valid 200 10m;
        proxy_cache_bypass $http_cache_control;
        add_header X-Cache-Status $upstream_cache_status;

        # ... 기존 proxy 설정 ...
    }
}
```

---

## 📞 지원 및 문의

- 프로젝트 GitHub: [Repository URL]
- Issue 트래커: [Issues URL]
- 문서: [README.md](README.md)

---

## 📚 참고 자료

- [ipTIME 공식 홈페이지](https://iptime.com)
- [Docker 공식 문서](https://docs.docker.com)
- [Let's Encrypt 공식 문서](https://letsencrypt.org)
- [Nginx 공식 문서](https://nginx.org/en/docs)
- [PostgreSQL 공식 문서](https://www.postgresql.org/docs)

---

**마지막 업데이트:** 2025-10-12
