# 방 예약 서비스 - 프론트엔드

Turborepo 기반 Monorepo 프론트엔드 프로젝트입니다.

## 📦 프로젝트 구조

```
frontend/
├── apps/
│   ├── user-web/          # 사용자용 웹 애플리케이션 (포트: 3000)
│   ├── admin-web/         # 관리자 대시보드 (포트: 3001)
│   └── kiosk-web/         # 키오스크 앱 (포트: 3002)
└── packages/
    ├── shared-types/      # 공통 타입 정의
    ├── api-client/        # API 통신 클라이언트
    ├── ui-components/     # 공통 UI 컴포넌트
    └── utils/             # 유틸리티 함수
```

## 🛠 기술 스택

### 핵심
- **Monorepo**: Turborepo
- **Build Tool**: Vite 6
- **Framework**: React 18
- **Language**: TypeScript 5

### 상태 관리
- **전역 상태**: Zustand
- **서버 상태**: TanStack Query (React Query)

### UI/스타일
- **CSS**: Tailwind CSS 3
- **컴포넌트**: shadcn/ui (준비 완료)
- **아이콘**: lucide-react
- **차트**: Recharts (admin-web)

### 통신
- **HTTP**: Axios
- **WebSocket**: Socket.io-client
- **QR**: html5-qrcode (kiosk-web)

### 폼/검증
- **폼 관리**: React Hook Form
- **검증**: Zod

### 라우팅
- React Router v6

## 🚀 시작하기

### 1. 의존성 설치

```bash
cd frontend
npm install
```

### 2. 환경 변수 설정

각 앱 디렉토리에 `.env` 파일을 생성합니다:

**user-web/.env**
```env
VITE_API_BASE_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

**admin-web/.env**, **kiosk-web/.env**도 동일하게 설정

### 3. 개발 서버 실행

**모든 앱 동시 실행**
```bash
npm run dev
```

**특정 앱만 실행**
```bash
npm run dev:user    # 사용자 웹 (localhost:3000)
npm run dev:admin   # 관리자 대시보드 (localhost:3001)
npm run dev:kiosk   # 키오스크 (localhost:3002)
```

## 📝 npm 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 모든 앱 개발 서버 실행 |
| `npm run dev:user` | 사용자 웹 개발 서버 실행 |
| `npm run dev:admin` | 관리자 웹 개발 서버 실행 |
| `npm run dev:kiosk` | 키오스크 웹 개발 서버 실행 |
| `npm run build` | 모든 앱 프로덕션 빌드 |
| `npm run lint` | 모든 앱 린트 검사 |
| `npm run type-check` | 모든 앱 타입 체크 |
| `npm run clean` | 빌드 산출물 및 캐시 삭제 |

## 📱 애플리케이션 가이드

### User Web (사용자 웹앱)

**주요 기능**
- 로그인/회원가입
- 방 검색 및 필터링
- 예약 신청/관리
- QR 코드 생성
- 실시간 알림

**페이지 구조**
- `/login` - 로그인
- `/register` - 회원가입
- `/` - 홈
- `/rooms` - 방 목록
- `/rooms/:id` - 방 상세
- `/reservations` - 내 예약
- `/reservations/:id` - 예약 상세
- `/profile` - 프로필

### Admin Web (관리자 대시보드)

**주요 기능**
- 통계 대시보드
- 사용자 관리
- 방 관리 (CRUD)
- 예약 관리
- 출입 기록 조회

**페이지 구조** (구현 예정)
- `/` - 대시보드
- `/users` - 사용자 관리
- `/rooms` - 방 관리
- `/reservations` - 예약 관리
- `/statistics` - 통계

### Kiosk Web (키오스크 앱)

**주요 기능**
- QR 코드 스캔
- PIN 코드 입력
- 출입 승인/거부

**특징**
- 전체 화면 모드
- 간소화된 UI
- 자동 리셋 (3초)

## 🔧 개발 가이드

### 공통 패키지 사용

**타입 import**
```typescript
import type { User, Room, Reservation } from '@roomservation/shared-types';
```

**API 클라이언트 사용**
```typescript
import { authApi, roomsApi } from '@roomservation/api-client';

// 로그인
const response = await authApi.login({ email, password });

// 방 목록 조회
const rooms = await roomsApi.getRooms({ minCapacity: 10 });
```

**유틸리티 함수**
```typescript
import { formatDate, isValidEmail } from '@roomservation/utils';

const formattedDate = formatDate('2024-01-01T00:00:00Z', 'yyyy-MM-dd');
const isValid = isValidEmail('test@example.com');
```

### React Query 사용 예시

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { roomsApi } from '@roomservation/api-client';

// 방 목록 조회
const { data: rooms, isLoading } = useQuery({
  queryKey: ['rooms'],
  queryFn: () => roomsApi.getRooms(),
});

// 예약 생성
const createMutation = useMutation({
  mutationFn: reservationsApi.createReservation,
  onSuccess: () => {
    // 성공 처리
  },
});
```

### Zustand 스토어 사용

```typescript
import { useAuthStore } from './store/authStore';

const Component = () => {
  const { user, isAuthenticated, setUser, logout } = useAuthStore();

  // ...
};
```

## 📂 디렉토리 구조 상세

### apps/user-web

```
user-web/
├── src/
│   ├── components/       # UI 컴포넌트
│   │   ├── layouts/     # 레이아웃 컴포넌트
│   │   └── ...
│   ├── pages/           # 페이지 컴포넌트
│   │   ├── auth/        # 인증 관련 페이지
│   │   ├── rooms/       # 방 관련 페이지
│   │   └── reservations/
│   ├── store/           # Zustand 스토어
│   ├── hooks/           # 커스텀 훅
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── public/
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## 🚧 다음 작업 (TODO)

### User Web
- [ ] 방 목록 페이지 구현
- [ ] 방 상세 페이지 구현
- [ ] 예약 신청 폼 구현
- [ ] 예약 관리 페이지 구현
- [ ] QR 코드 생성 기능
- [ ] WebSocket 실시간 알림 연동

### Admin Web
- [ ] 대시보드 통계 차트
- [ ] 사용자 관리 CRUD
- [ ] 방 관리 CRUD
- [ ] 예약 관리 기능
- [ ] 통계 데이터 시각화

### Kiosk Web
- [ ] QR 스캔 기능 구현 (html5-qrcode)
- [ ] PIN 입력 검증
- [ ] 토큰 검증 API 연동
- [ ] 승인/거부 애니메이션

### 공통
- [ ] shadcn/ui 컴포넌트 추가
- [ ] 에러 바운더리 설정
- [ ] 로딩 상태 공통 컴포넌트
- [ ] 토스트 알림 시스템
- [ ] E2E 테스트 (Playwright)

## 📖 참고 자료

- [Turborepo 문서](https://turbo.build/repo/docs)
- [Vite 문서](https://vitejs.dev/)
- [React Query 문서](https://tanstack.com/query/latest)
- [Zustand 문서](https://zustand-demo.pmnd.rs/)
- [Tailwind CSS 문서](https://tailwindcss.com/)
- [shadcn/ui 문서](https://ui.shadcn.com/)
