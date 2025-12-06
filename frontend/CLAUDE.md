# 방 예약 서비스 프론트엔드

## 요구사항

- [프로젝트 명세서](../README.md) 참고해서 작업한다.
- 공통 패키지 우선 사용 (shared-types, api-client, ui-components, utils)
- 컴포넌트, 페이지 구현 후, 필요시 테스트 코드를 작성한다.
- 작업하면서 `README.md`에 업데이트해야할 내용이 있다면 보완, 추가한다.
- 작업하면서 `CLAUDE.md`에 업데이트해야할 내용이 있다면 보완, 추가한다.

---

## 📋 작업 히스토리

### 2025-11-22 (1): 프론트엔드 프로젝트 초기 설정

#### 작업 내용
1. **Turborepo Monorepo 구조 설정**
   - Turborepo 2.3.3 기반 모노레포 구성
   - Workspace 설정 (apps/*, packages/*)
   - turbo.json 작업 파이프라인 정의

2. **3개 애플리케이션 생성**

   **a. User Web (사용자 웹앱) - Port 3000**
   - React 18 + TypeScript 5 + Vite 6
   - TanStack Query (React Query) 서버 상태 관리
   - Zustand 전역 상태 관리
   - React Router v6 라우팅
   - Tailwind CSS 3 스타일링
   - React Hook Form + Zod 폼 관리/검증
   - Socket.io-client WebSocket 연동

   **b. Admin Web (관리자 대시보드) - Port 3001**
   - User Web과 동일한 기술 스택
   - Recharts 차트 라이브러리 추가
   - 관리자 전용 UI/UX

   **c. Kiosk Web (키오스크 앱) - Port 3002**
   - User Web과 동일한 기술 스택
   - html5-qrcode QR 스캔 라이브러리
   - 전체 화면 모드 최적화

3. **4개 공통 패키지 생성**

   **a. @roomservation/shared-types**
   - 백엔드 API 응답 타입 정의
   - 도메인 엔티티 타입 (User, Room, Reservation, etc.)
   - 공통 유틸리티 타입

   **b. @roomservation/api-client**
   - Axios 기반 API 클라이언트
   - 모든 API 엔드포인트 함수화
   - 인증 토큰 자동 주입
   - 에러 핸들링

   **c. @roomservation/ui-components**
   - shadcn/ui 기반 공통 컴포넌트
   - Tailwind CSS 스타일링
   - Button, Input, Card, Modal 등
   - 디자인 시스템 통일

   **d. @roomservation/utils**
   - 날짜 포맷팅 (date-fns)
   - 유효성 검증 유틸리티
   - 공통 헬퍼 함수

4. **개발 환경 설정**
   - ESLint + TypeScript 린팅 설정
   - Prettier 코드 포맷팅
   - Vite 개발 서버 설정
   - 환경 변수 설정 (.env 템플릿)

5. **문서 작성**
   - README.md - 프로젝트 개요 및 사용 가이드
   - 기술 스택 상세 설명
   - 개발 가이드
   - npm 스크립트 가이드

#### 결과
- ✅ Turborepo Monorepo 구조 완성
- ✅ 3개 앱 + 4개 공통 패키지 설정 완료
- ✅ 개발 환경 통합 구성
- ✅ 포괄적인 프로젝트 문서 작성
- 📝 각 앱의 페이지/컴포넌트 구현 준비 완료

---

## 🎯 프로젝트 체크리스트

### ✅ 완료
- [x] Turborepo Monorepo 설정
- [x] 공통 패키지 구조 (shared-types, api-client, ui-components, utils)
- [x] User Web 앱 초기 설정
- [x] Admin Web 앱 초기 설정
- [x] Kiosk Web 앱 초기 설정
- [x] Tailwind CSS 설정
- [x] ESLint + TypeScript 설정
- [x] 프로젝트 문서 작성

### 🔄 User Web - 구현 중
- [ ] **인증 (Auth)**
  - [ ] 로그인 페이지 (`/login`)
  - [ ] 회원가입 페이지 (`/register`)
  - [ ] 비밀번호 찾기
  - [ ] 프로필 페이지 (`/profile`)
  - [ ] 비밀번호 변경
  - [ ] AuthStore (Zustand)
  - [ ] ProtectedRoute 컴포넌트

- [ ] **방 (Rooms)**
  - [ ] 방 목록 페이지 (`/rooms`)
    - [ ] 검색 기능
    - [ ] 필터링 (수용인원, 위치, 시설)
    - [ ] 정렬 (인기순, 최신순, 가격순)
    - [ ] 페이지네이션
  - [ ] 방 상세 페이지 (`/rooms/:id`)
    - [ ] 방 정보 표시
    - [ ] 시설 목록
    - [ ] 사진 갤러리
    - [ ] 예약 가능 시간대 캘린더
    - [ ] 예약 신청 버튼

- [ ] **예약 (Reservations)**
  - [ ] 예약 생성 플로우
    - [ ] 날짜/시간 선택
    - [ ] 목적 입력
    - [ ] 확인 및 제출
  - [ ] 내 예약 목록 (`/reservations`)
    - [ ] 상태별 필터 (대기, 승인, 거절, 완료, 취소)
    - [ ] 예약 카드 컴포넌트
  - [ ] 예약 상세 페이지 (`/reservations/:id`)
    - [ ] 예약 정보 표시
    - [ ] QR 코드 생성/표시
    - [ ] 입장 PIN 코드 표시
    - [ ] 예약 취소 버튼
    - [ ] 예약 수정 (시간 변경)

- [ ] **실시간 기능**
  - [ ] WebSocket 연결 (Socket.io)
  - [ ] 실시간 예약 상태 업데이트
  - [ ] 알림 토스트
  - [ ] 알림 센터 (`/notifications`)
  - [ ] 읽지 않은 알림 배지

- [ ] **레이아웃 & 공통 컴포넌트**
  - [ ] Header (로고, 네비게이션, 사용자 메뉴)
  - [ ] Footer
  - [ ] Sidebar (모바일)
  - [ ] LoadingSpinner
  - [ ] ErrorBoundary
  - [ ] Toast/Notification 시스템

### 🔄 Admin Web - 구현 중
- [ ] **대시보드 (`/`)**
  - [ ] 통계 카드 (총 사용자, 총 방, 오늘 예약, 금일 출입)
  - [ ] 예약 현황 차트 (Recharts)
  - [ ] 방별 사용률 차트
  - [ ] 최근 예약 목록
  - [ ] 최근 출입 기록

- [ ] **사용자 관리 (`/users`)**
  - [ ] 사용자 목록 (페이지네이션, 검색)
  - [ ] 사용자 상세 정보
  - [ ] 역할 변경 (USER → ADMIN)
  - [ ] 사용자 비활성화

- [ ] **방 관리 (`/rooms`)**
  - [ ] 방 목록
  - [ ] 방 생성 폼
  - [ ] 방 수정 폼
  - [ ] 방 삭제 (확인 모달)
  - [ ] 방 사진 업로드

- [ ] **예약 관리 (`/reservations`)**
  - [ ] 전체 예약 목록
  - [ ] 상태별 필터
  - [ ] 날짜 범위 필터
  - [ ] 예약 승인/거절
  - [ ] 예약 상세 정보

- [ ] **통계 (`/statistics`)**
  - [ ] 기간별 통계 (일, 주, 월, 년)
  - [ ] 방별 이용 통계
  - [ ] 사용자별 예약 통계
  - [ ] 시간대별 이용 패턴
  - [ ] CSV/Excel 내보내기

### 🔄 Kiosk Web - 구현 중
- [ ] **QR 스캔 화면**
  - [ ] html5-qrcode 카메라 스트림
  - [ ] QR 스캔 성공/실패 애니메이션
  - [ ] 자동 리셋 (3초)

- [ ] **PIN 입력 화면**
  - [ ] 숫자 키패드
  - [ ] PIN 검증
  - [ ] 성공/실패 애니메이션

- [ ] **출입 결과 화면**
  - [ ] 승인 (초록색, 체크 아이콘)
  - [ ] 거부 (빨간색, X 아이콘)
  - [ ] 사용자 정보 표시
  - [ ] 예약 정보 표시

- [ ] **설정**
  - [ ] 전체 화면 모드
  - [ ] 자동 리셋 시간 설정
  - [ ] 관리자 설정 페이지 (비밀번호 보호)

### 🔄 공통 패키지 - 구현 중
- [ ] **@roomservation/shared-types**
  - [ ] API 응답 타입 완성
  - [ ] Zod 스키마 추가
  - [ ] 타입 가드 함수

- [ ] **@roomservation/api-client**
  - [ ] 모든 API 엔드포인트 구현
  - [ ] 에러 타입 정의
  - [ ] Retry 로직
  - [ ] Request/Response Interceptor

- [ ] **@roomservation/ui-components**
  - [ ] shadcn/ui 컴포넌트 추가
    - [ ] Button, Input, Textarea
    - [ ] Select, Checkbox, Radio
    - [ ] Dialog, Sheet, Popover
    - [ ] Table, Pagination
    - [ ] Calendar, DatePicker
    - [ ] Toast, Alert
    - [ ] Tabs, Accordion
  - [ ] 커스텀 컴포넌트
    - [ ] RoomCard
    - [ ] ReservationCard
    - [ ] QRCodeDisplay
    - [ ] UserAvatar
    - [ ] StatusBadge

- [ ] **@roomservation/utils**
  - [ ] 날짜/시간 유틸리티 (date-fns)
  - [ ] 유효성 검증 함수
  - [ ] 포맷팅 함수 (전화번호, 숫자 등)
  - [ ] 상수 정의

### 📝 다음 작업 후보
1. **E2E 테스트 (Playwright)**
   - 주요 사용자 플로우 테스트
   - 로그인 → 방 검색 → 예약 → QR 생성
   - 관리자 플로우 테스트

2. **성능 최적화**
   - React.memo, useMemo, useCallback 적용
   - 이미지 레이지 로딩
   - Code Splitting (React.lazy)
   - 번들 사이즈 최적화

3. **접근성 (A11y)**
   - ARIA 속성 추가
   - 키보드 네비게이션
   - 스크린 리더 지원
   - 색상 대비 개선

4. **다국어 지원 (i18n)**
   - react-i18next 설정
   - 한국어/영어 지원
   - 언어 전환 UI

5. **PWA 지원**
   - Service Worker
   - 오프라인 모드
   - 앱 설치 지원
   - Push 알림

---

## 💡 개발 가이드라인

### 1. 컴포넌트 작성 규칙

**파일 구조**
```
components/
├── ui/              # shadcn/ui 컴포넌트 (자동 생성)
├── layouts/         # 레이아웃 컴포넌트
├── features/        # 기능별 컴포넌트
│   ├── auth/
│   ├── rooms/
│   └── reservations/
└── common/          # 공통 컴포넌트
```

**네이밍 컨벤션**
- 컴포넌트: PascalCase (`UserProfile.tsx`)
- 훅: camelCase with use prefix (`useAuth.ts`)
- 유틸: camelCase (`formatDate.ts`)
- 타입: PascalCase (`UserType.ts`)
- 상수: UPPER_SNAKE_CASE (`API_BASE_URL`)

**컴포넌트 작성 예시**
```typescript
import { FC } from 'react';
import type { Room } from '@roomservation/shared-types';

interface RoomCardProps {
  room: Room;
  onSelect?: (roomId: string) => void;
}

export const RoomCard: FC<RoomCardProps> = ({ room, onSelect }) => {
  return (
    <div className="rounded-lg border p-4 hover:shadow-md transition-shadow">
      <h3 className="text-lg font-semibold">{room.name}</h3>
      <p className="text-sm text-gray-600">{room.location}</p>
      {/* ... */}
    </div>
  );
};
```

### 2. 상태 관리

**Zustand 스토어 작성**
```typescript
// store/authStore.ts
import { create } from 'zustand';
import type { User } from '@roomservation/shared-types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setUser: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  setUser: (user, token) => set({ user, token, isAuthenticated: true }),
  logout: () => set({ user: null, token: null, isAuthenticated: false }),
}));
```

**React Query 사용**
```typescript
// hooks/useRooms.ts
import { useQuery } from '@tanstack/react-query';
import { roomsApi } from '@roomservation/api-client';

export const useRooms = (filters?: RoomFilters) => {
  return useQuery({
    queryKey: ['rooms', filters],
    queryFn: () => roomsApi.getRooms(filters),
    staleTime: 5 * 60 * 1000, // 5분
  });
};

export const useRoom = (roomId: string) => {
  return useQuery({
    queryKey: ['rooms', roomId],
    queryFn: () => roomsApi.getRoom(roomId),
    enabled: !!roomId,
  });
};
```

### 3. 폼 관리

**React Hook Form + Zod**
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('올바른 이메일을 입력하세요'),
  password: z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다'),
});

type LoginForm = z.infer<typeof loginSchema>;

export const LoginPage = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    // 로그인 로직
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} />
      {errors.email && <span>{errors.email.message}</span>}
      {/* ... */}
    </form>
  );
};
```

### 4. API 호출

**공통 패키지 사용**
```typescript
import { authApi, roomsApi, reservationsApi } from '@roomservation/api-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const useCreateReservation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reservationsApi.createReservation,
    onSuccess: () => {
      // 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
    onError: (error) => {
      // 에러 핸들링
      toast.error(error.message);
    },
  });
};
```

### 5. 스타일링

**Tailwind CSS 사용**
```tsx
// 기본 클래스 사용
<button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
  버튼
</button>

// 조건부 클래스
<div className={cn(
  "p-4 rounded",
  isActive && "bg-blue-100",
  isError && "border-red-500"
)}>
  Content
</div>
```

**shadcn/ui 컴포넌트 사용**
```tsx
import { Button } from '@roomservation/ui-components';

<Button variant="default" size="lg" onClick={handleClick}>
  클릭
</Button>
```

### 6. 에러 처리

**Error Boundary**
```typescript
// components/ErrorBoundary.tsx
import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>오류가 발생했습니다.</div>;
    }

    return this.props.children;
  }
}
```

### 7. 코드 품질

**린팅 규칙**
- ESLint: TypeScript 추천 규칙 + React 규칙
- 사용되지 않는 변수는 `_` 접두사 사용
- `any` 타입 사용 금지 (불가피한 경우 주석 설명)
- Console.log 제거 (디버깅 후)

**커밋 전 체크리스트**
- [ ] `npm run lint` 통과
- [ ] `npm run type-check` 통과
- [ ] 불필요한 console.log 제거
- [ ] 주석 정리
- [ ] 테스트 실행 (작성한 경우)

### 8. 성능 최적화

**메모이제이션**
```typescript
import { memo, useMemo, useCallback } from 'react';

// 컴포넌트 메모이제이션
export const RoomCard = memo(({ room, onSelect }) => {
  // ...
});

// 값 메모이제이션
const filteredRooms = useMemo(() => {
  return rooms.filter(room => room.capacity >= minCapacity);
}, [rooms, minCapacity]);

// 함수 메모이제이션
const handleSelect = useCallback((roomId: string) => {
  onSelect(roomId);
}, [onSelect]);
```

**레이지 로딩**
```typescript
import { lazy, Suspense } from 'react';

const AdminPage = lazy(() => import('./pages/AdminPage'));

<Suspense fallback={<LoadingSpinner />}>
  <AdminPage />
</Suspense>
```

---

## 🔧 개발 환경 설정

### 필수 도구
- Node.js 20.x 이상
- npm 10.x 이상

### 권장 VS Code 확장
- ESLint
- Prettier - Code formatter
- Tailwind CSS IntelliSense
- TypeScript and JavaScript Language Features
- Auto Rename Tag
- Path Intellisense

### VS Code 설정 (.vscode/settings.json)
```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "tailwindCSS.experimental.classRegex": [
    ["cn\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ]
}
```

---

## 📚 참고 자료

### 공식 문서
- [React 공식 문서](https://react.dev/)
- [TypeScript 공식 문서](https://www.typescriptlang.org/)
- [Vite 공식 문서](https://vitejs.dev/)
- [Turborepo 공식 문서](https://turbo.build/repo)

### 주요 라이브러리
- [TanStack Query (React Query)](https://tanstack.com/query/latest)
- [Zustand](https://zustand-demo.pmnd.rs/)
- [React Router](https://reactrouter.com/)
- [React Hook Form](https://react-hook-form.com/)
- [Zod](https://zod.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Socket.io Client](https://socket.io/docs/v4/client-api/)

### 유용한 도구
- [Tailwind CSS Cheat Sheet](https://nerdcave.com/tailwind-cheat-sheet)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [Can I Use](https://caniuse.com/) - 브라우저 호환성 확인
