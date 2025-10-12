# 테스트 가이드

## 개요

이 프로젝트는 두 가지 유형의 테스트를 제공합니다:

- **단위 테스트 (Unit Tests)**: 개별 모듈과 서비스의 기능을 테스트
- **E2E 테스트 (End-to-End Tests)**: 전체 애플리케이션의 API 엔드포인트를 테스트

## 단위 테스트

### 실행 방법

```bash
# 모든 단위 테스트 실행
npm test

# 감시 모드로 실행
npm run test:watch

# 커버리지 리포트 생성
npm run test:cov
```

### 현재 상태

- ✅ 11개 테스트 스위트
- ✅ 111개 테스트 모두 통과
- ✅ 모든 주요 서비스와 컨트롤러 커버

## E2E 테스트

### 사전 준비

E2E 테스트는 실제 데이터베이스 연결이 필요합니다. Docker Compose를 사용하여 쉽게 설정할 수 있습니다.

#### 1. Docker 설치

- [Docker Desktop](https://www.docker.com/products/docker-desktop)을 다운로드하여 설치

#### 2. 테스트 데이터베이스 시작

```bash
# PostgreSQL과 Redis 컨테이너 시작
docker-compose up -d

# 컨테이너 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs -f
```

#### 3. 테스트 실행

```bash
# E2E 테스트 실행
npm run test:e2e
```

#### 4. 테스트 완료 후 정리

```bash
# 컨테이너 중지
docker-compose down

# 데이터까지 모두 삭제 (선택사항)
docker-compose down -v
```

### E2E 테스트 구조

#### test/auth.e2e-spec.ts
- 사용자 등록 (회원가입)
- 로그인 / 로그아웃
- 프로필 조회 및 수정
- 비밀번호 변경

#### test/rooms.e2e-spec.ts
- 방 생성 (관리자만)
- 방 목록 조회 및 필터링
- 방 상세 정보 조회
- 방 가용성 확인
- 방 수정 및 삭제 (관리자만)

#### test/reservations.e2e-spec.ts
- 예약 생성 및 유효성 검증
  - 과거 시간 예약 불가
  - 최소/최대 예약 시간 검증
- 예약 목록 조회
- 예약 상세 조회
- 예약 수정
- 예약 취소

#### test/access.e2e-spec.ts
- 입장 토큰 생성 (QR/PIN)
- 토큰 검증
- 토큰 사용 기록
- 입장 히스토리 조회
- 현재 방 상태 조회

#### test/admin.e2e-spec.ts
- 사용자 목록 조회 및 필터링
- 예약 목록 조회 및 필터링
- 통계 데이터 조회
- 사용자 역할 변경
- 관리자 권한 검증

### 테스트 환경 설정

E2E 테스트는 `.env.test` 파일의 설정을 사용합니다:

```env
# Database - Test database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=testuser
DB_PASSWORD=testpass
DB_DATABASE=roomservation_test
```

## 테스트 작성 가이드

### 단위 테스트 작성

```typescript
describe('ServiceName', () => {
  let service: ServiceName;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ServiceName],
    }).compile();

    service = module.get<ServiceName>(ServiceName);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

### E2E 테스트 작성

```typescript
describe('Feature (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Apply same middleware as main.ts
    app.useGlobalPipes(new ValidationPipe({...}));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/endpoint (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/endpoint')
      .expect(200);
  });
});
```

## 트러블슈팅

### E2E 테스트가 연결 오류로 실패하는 경우

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**해결 방법**:
1. Docker Compose가 실행 중인지 확인: `docker-compose ps`
2. 컨테이너가 healthy 상태인지 확인: `docker-compose ps`
3. 포트 충돌이 없는지 확인: `lsof -i :5432` (macOS/Linux)

### E2E 테스트가 타임아웃되는 경우

```
Exceeded timeout of 5000 ms for a hook
```

**해결 방법**:
- `test/jest-e2e.json`에서 `testTimeout` 값이 설정되어 있는지 확인
- 현재 설정: 30000ms (30초)

### Docker 컨테이너가 시작되지 않는 경우

```
Error: port is already allocated
```

**해결 방법**:
1. 기존 PostgreSQL/Redis 서비스를 중지
2. 포트 사용 중인 프로세스 확인 및 종료
3. Docker Desktop 재시작

## CI/CD 통합

### GitHub Actions 예시

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: testuser
          POSTGRES_PASSWORD: testpass
          POSTGRES_DB: roomservation_test
        ports:
          - 5432:5432

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - run: npm ci
      - run: npm test
      - run: npm run test:e2e
```

## 참고 자료

- [NestJS Testing Documentation](https://docs.nestjs.com/fundamentals/testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [SuperTest Documentation](https://github.com/ladjs/supertest)
