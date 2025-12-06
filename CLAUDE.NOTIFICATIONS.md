# 🔔 Notifications 도메인 (실시간 알림)

## 📋 목차
- [개요](#개요)
- [도메인 간 관계](#도메인-간-관계)
- [핵심 기능](#핵심-기능)
- [WebSocket 연결](#websocket-연결)
- [알림 이벤트](#알림-이벤트)
- [알림 전송 메커니즘](#알림-전송-메커니즘)
- [보안 및 권한](#보안-및-권한)
- [코드 위치](#코드-위치)
- [데이터 구조](#데이터-구조)

---

## 개요

Notifications 도메인은 WebSocket 기반 실시간 알림 시스템을 제공하는 모듈입니다.

### 주요 책임
- 실시간 양방향 통신 (WebSocket)
- 예약/출입 이벤트 알림
- 사용자별/방별 알림 전송
- 관리자 알림 관리
- 연결 상태 관리

### 기술 스택
- **Socket.IO**: WebSocket 라이브러리
- **JWT 인증**: WsJwtGuard
- **Pub/Sub 패턴**: Room 기반 구독

---

## 도메인 간 연관 관계

### 역할
**"실시간 이벤트 전달 및 사용자 경험 향상"**

Notifications 도메인은 WebSocket 기반으로 시스템의 모든 주요 이벤트를 실시간으로 사용자에게 전달하여, 즉각적인 피드백과 원활한 사용자 경험을 제공하는 역할을 담당합니다.

---

### 비즈니스 연관 관계

#### 📊 Auth (인증/권한)
**관계**: WebSocket 연결 보안 검증
- Auth는 Notifications에게 **WebSocket 연결 인증**을 제공
- **비즈니스 의미**:
  - WebSocket 연결 시 JWT 토큰 검증 필수
  - 인증된 사용자만 알림 구독 가능
  - 역할별 알림 차등 제공 (USER vs ADMIN)
- **보안 검증**: WsJwtGuard (WebSocket JWT 가드)

**비즈니스 흐름**
```
[클라이언트] WebSocket 연결 요청
  ↓
[Auth] JWT 토큰 검증 (WsJwtGuard)
  ├─ 유효한 토큰 → 연결 승인
  └─ 무효한 토큰 → 연결 거부
  ↓
[Notifications] subscribe 이벤트 리스닝
  ↓
[Room Join] user:${userId} Room에 참여
```

---

#### 📅 Reservations (예약 관리)
**관계**: 예약 이벤트 발행 관계
- Reservations는 Notifications를 통해 **예약 상태 변경을 실시간 전달**
- **비즈니스 의미**:
  - 예약 생성 시 즉시 알림 (대기자 확인 불필요)
  - 예약 확정 시 QR 코드 안내 알림
  - 예약 취소 시 방 가용성 알림 (대기자에게 기회)
  - 노쇼 처리 시 경고 알림

**비즈니스 흐름**
```
[예약 생성]
  ↓
[Reservations] 예약 저장 (PENDING)
  ↓
[Notifications] notifyReservationCreated()
  ├─ 예약자에게: "예약이 신청되었습니다"
  └─ 관리자들에게: "새 예약 승인 대기"
  ↓
[사용자] 실시간 알림 수신

---

[예약 취소]
  ↓
[Reservations] 상태 변경 (CANCELLED)
  ↓
[Notifications] notifyReservationCancelled()
  ├─ 예약자에게: "예약이 취소되었습니다"
  ├─ 관리자들에게: "예약 취소됨"
  └─ room:${roomId} 구독자들에게: "방이 비었습니다" (room:available)
  ↓
[대기자들] 예약 가능 알림 수신
```

**발행하는 이벤트**
- `RESERVATION_CREATED`: 예약 생성
- `RESERVATION_UPDATED`: 예약 수정
- `RESERVATION_CANCELLED`: 예약 취소
- `RESERVATION_COMPLETED`: 예약 완료
- `RESERVATION_NO_SHOW`: 노쇼 처리

---

#### 🚪 Access (출입 제어)
**관계**: 출입 이벤트 실시간 전달
- Access는 Notifications를 통해 **출입 승인/거부를 즉시 피드백**
- **비즈니스 의미**:
  - 토큰 검증 결과 즉시 알림
  - 출입 성공 시 환영 메시지
  - 출입 실패 시 사유 안내
  - 토큰 생성 가능 시점 알림

**비즈니스 흐름**
```
[예약 시작 10분 전]
  ↓
[Notifications] 토큰 생성 가능 알림
  ↓
[사용자] "이제 QR 코드를 생성할 수 있습니다"
  ↓
[토큰 생성]
  ↓
[Notifications] QR 코드 이미지 전송

---

[QR 스캔]
  ↓
[Access] 토큰 검증
  ├─ 성공 → notifyAccessGranted()
  │   ↓
  │   [Notifications] "입장이 승인되었습니다"
  │   ↓
  │   [사용자] 환영 메시지 + 방 정보
  └─ 실패 → notifyAccessDenied()
      ↓
      [Notifications] "토큰이 유효하지 않습니다" + 사유
```

**발행하는 이벤트**
- `ACCESS_GRANTED`: 출입 승인
- `ACCESS_DENIED`: 출입 거부
- `ROOM_OCCUPIED`: 방 사용 시작
- `ROOM_AVAILABLE`: 방 사용 종료

---

#### 🏢 Rooms (회의실 관리)
**관계**: 방 상태 변경 알림 관계
- Rooms는 Notifications를 통해 **방 정보 변경을 실시간 전달**
- **비즈니스 의미**:
  - 방 정보 수정 시 해당 방 구독자에게 알림
  - 방 비활성화 시 예약자들에게 알림
  - 방 운영 시간 변경 시 안내

**비즈니스 흐름** (향후 구현)
```
[관리자] 방 정보 수정 (수용인원 20명 → 15명)
  ↓
[Rooms] 방 정보 업데이트
  ↓
[Notifications] room:${roomId} 구독자들에게 알림
  ↓
[해당 방 예약자들] "방 정보가 변경되었습니다"
```

---

#### 🔧 Admin (관리)
**관계**: 관리자 전용 알림 수신
- Admin은 Notifications를 통해 **시스템 전체 이벤트**를 실시간 모니터링
- **비즈니스 의미**:
  - 모든 예약 생성/취소 알림 수신
  - 노쇼 발생 시 즉시 알림
  - 출입 기록 실시간 확인
  - 시스템 공지 발송 (향후 구현)

**비즈니스 흐름**
```
[관리자 로그인]
  ↓
[Notifications] admins Room 자동 Join (TODO)
  ↓
[시스템 이벤트 발생]
  ├─ 예약 생성 → 관리자 알림
  ├─ 예약 취소 → 관리자 알림
  ├─ 노쇼 발생 → 관리자 긴급 알림
  └─ 이상 출입 → 관리자 보안 알림
  ↓
[관리자 Dashboard] 실시간 알림 표시
```

**관리자 전용 알림 (향후)**
- 시스템 이상 감지
- 반복 노쇼 사용자 경고
- 방 이용률 통계
- 보안 이벤트

---

#### ⏰ Scheduler (자동 처리)
**관계**: 자동 처리 결과 알림 발행
- Scheduler는 Notifications를 통해 **자동 처리 결과를 사용자에게 전달**
- **비즈니스 의미**:
  - 예약 자동 완료 시 완료 알림
  - 노쇼 자동 처리 시 경고 알림
  - 예약 시작 전 리마인더 (향후)

**비즈니스 흐름**
```
[예약 시작 30분 경과]
  ↓
[Scheduler] 10분마다 체크
  ↓
[입장 기록 없음 확인]
  ↓
[Reservations] status = NO_SHOW
  ↓
[Notifications] notifyReservationNoShow()
  ├─ 예약자에게: "예약이 노쇼 처리되었습니다"
  ├─ 관리자들에게: "노쇼 발생 알림"
  └─ room:${roomId} 구독자들에게: "방이 비었습니다"

---

[예약 종료 시간 경과]
  ↓
[Scheduler] 10분마다 체크
  ↓
[Reservations] status = COMPLETED
  ↓
[Notifications] notifyReservationCompleted()
  ├─ 예약자에게: "예약이 완료되었습니다"
  └─ room:${roomId} 구독자들에게: "방이 비었습니다"
```

---

### 데이터 관점의 관계

| 도메인 | 관계 타입 | 비즈니스 의미 | 이벤트 발행 |
|--------|----------|--------------|-----------|
| **Reservations** | 이벤트 발행 | 예약 상태 변경 실시간 전달 | 5개 이벤트 |
| **Access** | 이벤트 발행 | 출입 결과 즉시 피드백 | 4개 이벤트 |
| **Scheduler** | 이벤트 발행 | 자동 처리 결과 알림 | 2개 이벤트 |
| **Auth** | 횡단 관심사 | WebSocket 연결 인증 | - |
| **Admin** | 이벤트 수신 | 시스템 전체 이벤트 모니터링 | - |
| **Rooms** | 이벤트 발행 (TODO) | 방 정보 변경 알림 | - |

---

### 비즈니스 프로세스에서의 역할

#### 1. 예약 생명주기 알림
```
[예약 신청]
  ↓
[Notifications] "예약이 신청되었습니다"
  ↓
[관리자 확정]
  ↓
[Notifications] "예약이 확정되었습니다 + QR 코드 생성 안내"
  ↓
[예약 시작 10분 전]
  ↓
[Notifications] "이제 QR 코드를 생성할 수 있습니다"
  ↓
[QR 생성]
  ↓
[Notifications] QR 코드 이미지 전송
  ↓
[입장]
  ↓
[Notifications] "입장이 승인되었습니다"
  ↓
[예약 종료]
  ↓
[Notifications] "예약이 완료되었습니다"
```

#### 2. 방 가용성 알림 프로세스
```
[사용자 A] 관심 방 구독 (room:${roomId})
  ↓
[사용자 B] 해당 방 예약 취소
  ↓
[Notifications] room:${roomId} 구독자들에게 알림
  ├─ "방이 비었습니다"
  ├─ 시간대: 10:00 ~ 12:00
  └─ 예약 가능 링크
  ↓
[사용자 A] 즉시 예약 신청 가능
```

#### 3. 노쇼 처리 알림 프로세스
```
[예약 시작]
  ↓
[30분 경과]
  ↓
[Scheduler] 입장 기록 없음 확인
  ↓
[Reservations] NO_SHOW 처리
  ↓
[Notifications]
  ├─ 예약자에게: "예약이 노쇼 처리되었습니다"
  │   └─ "노쇼 3회 누적 시 예약 제한"
  ├─ 관리자들에게: "노쇼 발생 알림"
  │   └─ 사용자 정보 + 누적 노쇼 횟수
  └─ room:${roomId} 구독자들에게: "방이 비었습니다"
      └─ 대기자 예약 기회 제공
```

#### 4. 관리자 모니터링 프로세스
```
[관리자 Dashboard 접속]
  ↓
[WebSocket 연결 + admins Room Join]
  ↓
[시스템 이벤트 실시간 수신]
  ├─ 새 예약 알림 (승인 필요)
  ├─ 예약 취소 알림
  ├─ 노쇼 발생 알림
  ├─ 이상 출입 알림
  └─ 시스템 오류 알림
  ↓
[관리자] 즉시 대응 가능
```

---

### 핵심 비즈니스 규칙

1. **실시간성**
   - WebSocket으로 즉각적인 이벤트 전달
   - 폴링 불필요 (서버 부하 감소)
   - 사용자 경험 향상

2. **Room 기반 Pub/Sub**
   - `user:${userId}`: 개인 알림 전용
   - `admins`: 관리자 전체 알림
   - `room:${roomId}`: 방 구독자 알림
   - 불필요한 알림 전송 방지

3. **다중 디바이스 지원**
   - 한 사용자가 여러 소켓 연결 가능
   - Map<userId, Set<socketId>> 구조
   - 모든 디바이스에 동일 알림 전달

4. **인증 보안**
   - WebSocket 연결 시 JWT 검증 필수
   - WsJwtGuard로 subscribe/unsubscribe 보호
   - 인증 실패 시 연결 거부

5. **이벤트 타입 (9개)**
   - 예약: CREATED, UPDATED, CANCELLED, COMPLETED, NO_SHOW
   - 출입: ACCESS_GRANTED, ACCESS_DENIED
   - 방: ROOM_OCCUPIED, ROOM_AVAILABLE

6. **알림 대상**
   - 특정 사용자: `sendToUser(userId, event, data)`
   - 모든 관리자: `sendToAdmins(event, data)`
   - 방 구독자: `sendToRoom(roomId, event, data)`
   - 전체 브로드캐스트: `broadcast(event, data)`

7. **연결 관리**
   - 연결/해제 자동 추적
   - userConnections Map 자동 정리
   - 메모리 누수 방지

---

## 핵심 기능

### 1. WebSocket Gateway
**위치**: `src/notifications/notifications.gateway.ts`

```typescript
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true
  },
  namespace: '/notifications'
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect
```

**설정**
- **Namespace**: `/notifications`
- **CORS**: 환경 변수 기반 설정
- **Credentials**: true (쿠키 전송 허용)

#### 연결 엔드포인트
```
ws://localhost:3000/notifications
```

---

### 2. 연결 관리

#### 클라이언트 연결
**위치**: `src/notifications/notifications.gateway.ts:30`

```typescript
handleConnection(client: Socket) {
  this.logger.log(`Client connected: ${client.id}`);
}
```

**프로세스**
1. 클라이언트 WebSocket 연결
2. Socket ID 생성 (Socket.IO)
3. 연결 로그 기록

#### 클라이언트 연결 해제
**위치**: `src/notifications/notifications.gateway.ts:34`

```typescript
handleDisconnect(client: Socket) {
  this.logger.log(`Client disconnected: ${client.id}`);

  // Remove client from user connections
  for (const [userId, socketIds] of this.userConnections.entries()) {
    if (socketIds.has(client.id)) {
      socketIds.delete(client.id);
      if (socketIds.size === 0) {
        this.userConnections.delete(userId);
      }
      break;
    }
  }
}
```

**프로세스**
1. 연결 해제 감지
2. userConnections Map에서 제거
3. 빈 Set 정리 (메모리 관리)

---

### 3. 사용자 연결 매핑

**데이터 구조**
```typescript
private readonly userConnections = new Map<string, Set<string>>();
// userId -> Set of socketIds
```

**특징**
- 한 사용자가 여러 소켓 연결 가능 (다중 디바이스)
- Set으로 중복 방지
- 자동 정리 (연결 해제 시)

**예시**
```typescript
userConnections = {
  'user-123': Set(['socket-abc', 'socket-def']),  // 2개 디바이스
  'user-456': Set(['socket-xyz'])                  // 1개 디바이스
}
```

---

### 4. 구독 (Subscribe)
**위치**: `src/notifications/notifications.gateway.ts:50`

```typescript
@UseGuards(WsJwtGuard)
@SubscribeMessage('subscribe')
handleSubscribe(
  @MessageBody() data: { userId: string },
  @ConnectedSocket() client: Socket
)
```

**클라이언트 코드 예시**
```typescript
import io from 'socket.io-client';

const socket = io('http://localhost:3000/notifications', {
  auth: {
    token: accessToken  // JWT Access Token
  }
});

socket.emit('subscribe', { userId: 'user-123' });

socket.on('connect', () => {
  console.log('Connected to notifications');
});
```

**프로세스**
1. JWT 토큰 검증 (WsJwtGuard)
2. userId와 socketId 매핑 저장
3. `user:${userId}` Room에 Join
4. 구독 확인 응답

**응답**
```json
{
  "success": true,
  "message": "Subscribed to notifications"
}
```

---

### 5. 구독 해제 (Unsubscribe)
**위치**: `src/notifications/notifications.gateway.ts:70`

```typescript
@UseGuards(WsJwtGuard)
@SubscribeMessage('unsubscribe')
handleUnsubscribe(
  @MessageBody() data: { userId: string },
  @ConnectedSocket() client: Socket
)
```

**클라이언트 코드 예시**
```typescript
socket.emit('unsubscribe', { userId: 'user-123' });

socket.on('disconnect', () => {
  console.log('Disconnected from notifications');
});
```

**프로세스**
1. userConnections에서 제거
2. `user:${userId}` Room에서 Leave
3. 구독 해제 확인 응답

---

## WebSocket 연결

### 클라이언트 예시 (React)

```typescript
import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

export const useNotifications = (userId: string, accessToken: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    // WebSocket 연결
    const newSocket = io('http://localhost:3000/notifications', {
      auth: { token: accessToken }
    });

    // 연결 성공
    newSocket.on('connect', () => {
      console.log('Connected to notifications');
      // 사용자 알림 구독
      newSocket.emit('subscribe', { userId });
    });

    // 예약 생성 알림
    newSocket.on('reservation:created', (payload) => {
      console.log('Reservation created:', payload);
      setNotifications(prev => [...prev, payload]);
    });

    // 예약 취소 알림
    newSocket.on('reservation:cancelled', (payload) => {
      console.log('Reservation cancelled:', payload);
      setNotifications(prev => [...prev, payload]);
    });

    // 방 가용 알림
    newSocket.on('room:available', (payload) => {
      console.log('Room available:', payload);
      setNotifications(prev => [...prev, payload]);
    });

    // 연결 해제
    newSocket.on('disconnect', () => {
      console.log('Disconnected from notifications');
    });

    setSocket(newSocket);

    // Cleanup
    return () => {
      newSocket.emit('unsubscribe', { userId });
      newSocket.disconnect();
    };
  }, [userId, accessToken]);

  return { socket, notifications };
};
```

---

## 알림 이벤트

### NotificationEvent Enum
**위치**: `src/notifications/notifications.service.ts:4`

```typescript
enum NotificationEvent {
  RESERVATION_CREATED = 'reservation:created',
  RESERVATION_UPDATED = 'reservation:updated',
  RESERVATION_CANCELLED = 'reservation:cancelled',
  RESERVATION_COMPLETED = 'reservation:completed',
  RESERVATION_NO_SHOW = 'reservation:no_show',
  ROOM_OCCUPIED = 'room:occupied',
  ROOM_AVAILABLE = 'room:available',
  ACCESS_GRANTED = 'access:granted',
  ACCESS_DENIED = 'access:denied'
}
```

### 1. 예약 생성 (RESERVATION_CREATED)
**위치**: `src/notifications/notifications.service.ts:29`

```typescript
notifyReservationCreated(userId: string, reservation: any)
```

**전송 대상**
- ✅ 예약 생성자 (userId)
- ✅ 모든 관리자 (admins)

**Payload**
```json
{
  "event": "reservation:created",
  "data": {
    "id": "res123...",
    "title": "프로젝트 미팅",
    "roomId": "room123...",
    "startTime": "2025-10-15T10:00:00Z",
    "endTime": "2025-10-15T12:00:00Z"
  },
  "timestamp": "2025-10-12T14:30:00Z"
}
```

---

### 2. 예약 수정 (RESERVATION_UPDATED)
**위치**: `src/notifications/notifications.service.ts:52`

```typescript
notifyReservationUpdated(userId: string, reservation: any)
```

**전송 대상**
- ✅ 예약 소유자 (userId)
- ✅ 모든 관리자

---

### 3. 예약 취소 (RESERVATION_CANCELLED)
**위치**: `src/notifications/notifications.service.ts:75`

```typescript
notifyReservationCancelled(userId: string, reservation: any)
```

**전송 대상**
- ✅ 예약 소유자 (userId)
- ✅ 모든 관리자
- ✅ 해당 방 구독자 (room:available)

**특징**
- 방 가용성 알림도 함께 전송
- 대기열 사용자에게 유용

---

### 4. 예약 완료 (RESERVATION_COMPLETED)
**위치**: `src/notifications/notifications.service.ts:109`

```typescript
notifyReservationCompleted(userId: string, reservation: any)
```

**전송 대상**
- ✅ 예약 소유자 (userId)
- ✅ 해당 방 구독자 (room:available)

**트리거**
- Scheduler에서 자동 호출 (예약 종료 시간)

---

### 5. 노쇼 (RESERVATION_NO_SHOW)
**위치**: `src/notifications/notifications.service.ts:137`

```typescript
notifyReservationNoShow(userId: string, reservation: any)
```

**전송 대상**
- ✅ 예약 소유자 (userId)
- ✅ 모든 관리자
- ✅ 해당 방 구독자 (room:available)

**트리거**
- Scheduler에서 자동 호출 (예약 시작 30분 경과, 입장 기록 없음)

---

### 6. 방 입장 (ROOM_OCCUPIED)
**위치**: `src/notifications/notifications.service.ts:171`

```typescript
notifyRoomOccupied(roomId: string, reservation: any)
```

**전송 대상**
- ✅ 해당 방 구독자 (`room:${roomId}`)
- ✅ 모든 관리자

**트리거**
- 입장 토큰 검증 성공 시

---

### 7. 방 가용 (ROOM_AVAILABLE)
**위치**: `src/notifications/notifications.service.ts:194`

```typescript
notifyRoomAvailable(roomId: string)
```

**전송 대상**
- ✅ 해당 방 구독자 (`room:${roomId}`)

**트리거**
- 예약 취소
- 예약 완료
- 노쇼 처리

---

### 8. 접근 승인 (ACCESS_GRANTED)
**위치**: `src/notifications/notifications.service.ts:210`

```typescript
notifyAccessGranted(userId: string, roomId: string, accessDetails: any)
```

**전송 대상**
- ✅ 접근 요청자 (userId)

**트리거**
- 입장 토큰 검증 성공

---

### 9. 접근 거부 (ACCESS_DENIED)
**위치**: `src/notifications/notifications.service.ts:227`

```typescript
notifyAccessDenied(userId: string, roomId: string, reason: string)
```

**전송 대상**
- ✅ 접근 요청자 (userId)

**트리거**
- 입장 토큰 검증 실패

---

## 알림 전송 메커니즘

### 1. 특정 사용자에게 전송 (sendToUser)
**위치**: `src/notifications/notifications.gateway.ts:94`

```typescript
sendToUser(userId: string, event: string, data: any) {
  this.server.to(`user:${userId}`).emit(event, data);
}
```

**Room 이름**: `user:${userId}`

**예시**
```typescript
// user-123에게 알림 전송
sendToUser('user-123', 'reservation:created', payload);

// Socket.IO Room: 'user:user-123'
```

---

### 2. 모든 관리자에게 전송 (sendToAdmins)
**위치**: `src/notifications/notifications.gateway.ts:102`

```typescript
sendToAdmins(event: string, data: any) {
  this.server.to('admins').emit(event, data);
}
```

**Room 이름**: `admins`

**주의**: 관리자 구독 로직 추가 필요 (TODO)

---

### 3. 방 구독자에게 전송 (sendToRoom)
**위치**: `src/notifications/notifications.gateway.ts:118`

```typescript
sendToRoom(roomId: string, event: string, data: any) {
  this.server.to(`room:${roomId}`).emit(event, data);
}
```

**Room 이름**: `room:${roomId}`

**사용 사례**
- 방 가용성 변경 알림
- 방 입장 알림
- 예약 취소 알림 (해당 방 관심 사용자)

---

### 4. 전체 브로드캐스트 (broadcast)
**위치**: `src/notifications/notifications.gateway.ts:110`

```typescript
broadcast(event: string, data: any) {
  this.server.emit(event, data);
}
```

**전송 대상**: 모든 연결된 클라이언트

**사용 사례**
- 시스템 공지사항
- 긴급 알림

---

## 보안 및 권한

### WsJwtGuard
**위치**: `src/notifications/guards/ws-jwt.guard.ts`

```typescript
@UseGuards(WsJwtGuard)
@SubscribeMessage('subscribe')
```

**검증 프로세스**
1. WebSocket handshake 시 JWT 토큰 추출
2. 토큰 유효성 검증
3. 사용자 정보 추출 (userId, role)
4. 인증 실패 시 연결 거부

**클라이언트 토큰 전송**
```typescript
const socket = io('ws://localhost:3000/notifications', {
  auth: {
    token: 'Bearer eyJhbGciOiJIUzI1NiIs...'
  }
});
```

---

## 코드 위치

### Gateway
- **경로**: `src/notifications/notifications.gateway.ts`
- **라인 수**: 123줄
- **이벤트 핸들러**: 2개 (subscribe, unsubscribe)

### Service
- **경로**: `src/notifications/notifications.service.ts`
- **라인 수**: 241줄
- **메서드**: 9개 (알림 전송 함수)

### 가드
- **경로**: `src/notifications/guards/ws-jwt.guard.ts`
- **역할**: WebSocket JWT 인증

---

## 데이터 구조

### NotificationPayload

```typescript
interface NotificationPayload {
  event: NotificationEvent;   // 이벤트 타입
  data: any;                   // 이벤트 데이터
  timestamp: Date;             // 발생 시간
}
```

### 예약 알림 예시

```json
{
  "event": "reservation:created",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "프로젝트 킥오프",
    "purpose": "2025년 1분기 계획",
    "roomId": "room-123",
    "userId": "user-456",
    "startTime": "2025-10-15T10:00:00Z",
    "endTime": "2025-10-15T12:00:00Z",
    "attendees": 15,
    "status": "CONFIRMED"
  },
  "timestamp": "2025-10-12T14:30:00.000Z"
}
```

### 방 가용 알림 예시

```json
{
  "roomId": "room-123",
  "availableFrom": "2025-10-15T10:00:00Z",
  "timestamp": "2025-10-12T14:30:00.000Z"
}
```

---

## 주요 의존성

- `@nestjs/websockets` - WebSocket 통합
- `socket.io` - WebSocket 라이브러리
- `@nestjs/platform-socket.io` - Socket.IO 어댑터

---

## 테스트

### 단위 테스트
- **파일**: `src/notifications/notifications.service.spec.ts`
- **커버리지**: NotificationsService의 모든 메서드

### E2E 테스트
- **파일**: `test/notifications.e2e-spec.ts` (TODO)
- **테스트 케이스**:
  - WebSocket 연결/해제
  - 구독/구독 해제
  - 알림 전송 (사용자, 관리자, 방)

---

## 성능 최적화

### 1. Room 기반 Pub/Sub
- Socket.IO의 Room 기능 활용
- 불필요한 알림 전송 방지
- 네트워크 대역폭 절약

### 2. 연결 관리
```typescript
private readonly userConnections = new Map<string, Set<string>>();
```
- Map + Set 자료구조로 빠른 조회 (O(1))
- 메모리 효율적 관리

### 3. 로깅
```typescript
this.logger.log(`Sent ${event} to user ${userId}`);
```
- 알림 전송 추적
- 디버깅 및 모니터링

---

## 다음 개선 사항

1. **관리자 Room 자동 구독**
   - 관리자 로그인 시 'admins' Room 자동 Join
   - 역할 기반 자동 구독

2. **방 구독 API**
   - 사용자가 관심 있는 방 구독
   - `socket.emit('subscribe:room', { roomId })`

3. **알림 히스토리**
   - DB에 알림 기록 저장
   - 미수신 알림 조회 API
   - 읽음 표시 기능

4. **푸시 알림 통합**
   - FCM (Firebase Cloud Messaging)
   - 앱이 백그라운드일 때 푸시 알림
   - 웹 푸시 알림

5. **알림 설정**
   - 사용자별 알림 on/off 설정
   - 알림 카테고리별 설정
   - 알림 수신 시간대 설정

6. **알림 우선순위**
   - 중요 알림 (예: 노쇼) 강조
   - 일반 알림 묶음 전송

7. **알림 그룹화**
   - 동일 이벤트 묶음 전송
   - "3개의 새 예약이 있습니다"

8. **재연결 로직**
   - 클라이언트 자동 재연결
   - 미수신 알림 재전송
   - Exponential backoff

9. **모니터링 대시보드**
   - 실시간 연결 수
   - 알림 전송 통계
   - 에러 추적

---

## Socket.IO Room 구조

```
Namespace: /notifications

Rooms:
  - user:user-123           // 사용자별 Room
  - user:user-456
  - admins                  // 관리자 Room
  - room:room-abc           // 방별 Room
  - room:room-def
```

### Room Join/Leave

```typescript
// Join
client.join('user:user-123');
client.join('admins');
client.join('room:room-abc');

// Leave
client.leave('user:user-123');
client.leave('room:room-abc');
```

### 알림 전송

```typescript
// user:user-123 Room에 속한 모든 소켓에 전송
this.server.to('user:user-123').emit('reservation:created', payload);

// admins Room에 속한 모든 소켓에 전송
this.server.to('admins').emit('reservation:created', payload);

// room:room-abc Room에 속한 모든 소켓에 전송
this.server.to('room:room-abc').emit('room:available', payload);
```

---

## 클라이언트 라이브러리

### JavaScript/TypeScript
```bash
npm install socket.io-client
```

### React Hook 예시
```typescript
// useNotifications.ts
import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

export const useNotifications = (userId: string, token: string) => {
  const [socket, setSocket] = useState<Socket>();
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const newSocket = io('http://localhost:3000/notifications', {
      auth: { token }
    });

    newSocket.on('connect', () => {
      newSocket.emit('subscribe', { userId });
    });

    // 모든 알림 이벤트 리스닝
    Object.values(NotificationEvent).forEach(event => {
      newSocket.on(event, (payload) => {
        setNotifications(prev => [payload, ...prev]);
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit('unsubscribe', { userId });
      newSocket.disconnect();
    };
  }, [userId, token]);

  return { socket, notifications };
};
```

---

## 트러블슈팅

### 연결 실패
```typescript
socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
  // JWT 토큰 만료 또는 유효하지 않음
});
```

### 재연결
```typescript
socket.on('disconnect', (reason) => {
  if (reason === 'io server disconnect') {
    // 서버에서 강제 연결 해제 (인증 실패 등)
    socket.connect();
  }
  // 'io client disconnect': 클라이언트에서 연결 해제
  // 'ping timeout': 타임아웃
  // 'transport close': 네트워크 에러
});
```

### CORS 에러
```typescript
// 서버 설정
cors: {
  origin: ['http://localhost:3000', 'https://yourdomain.com'],
  credentials: true
}
```
