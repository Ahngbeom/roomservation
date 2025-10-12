# 데이터베이스 설정 가이드

## 1. 환경 설정

`.env` 파일을 생성하고 다음 내용을 설정하세요:

```env
# Database
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your_username
DB_PASSWORD=your_password
DB_DATABASE=roomservation
```

## 2. PostgreSQL 설치 및 설정

### PostgreSQL 설치
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# macOS (Homebrew)
brew install postgresql
brew services start postgresql

# Windows
# https://www.postgresql.org/download/windows/ 에서 다운로드
```

### 데이터베이스 생성
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

## 3. TypeORM 동기화

개발 환경에서는 `synchronize: true` 설정으로 자동으로 스키마가 생성됩니다.

```bash
# 개발 서버 실행 (자동으로 테이블 생성)
npm run start:dev
```

## 4. 마이그레이션 (프로덕션 권장)

프로덕션 환경에서는 마이그레이션을 사용하세요:

```bash
# 마이그레이션 파일 생성
npm run migration:generate -- src/database/migrations/InitialSchema

# 마이그레이션 실행
npm run migration:run

# 마이그레이션 롤백
npm run migration:revert
```

## 5. 데이터베이스 연결 확인

```bash
# 애플리케이션 실행
npm run start:dev

# 로그에서 다음 메시지 확인:
# "Application is running on: http://localhost:3000"
```

## 6. 테이블 구조

다음 테이블들이 자동으로 생성됩니다:

- **users** - 사용자 정보
- **rooms** - 방 정보
- **reservations** - 예약 정보
- **room_access** - 방 입장 기록

## 7. 문제 해결

### 연결 오류
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
→ PostgreSQL 서비스가 실행 중인지 확인하세요

### 인증 오류
```
Error: password authentication failed
```
→ .env 파일의 사용자명/비밀번호를 확인하세요

### 데이터베이스 없음
```
Error: database "roomservation" does not exist
```
→ 위의 2단계를 따라 데이터베이스를 생성하세요
