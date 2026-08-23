# SAVE 플랫폼 통합·채팅·푸시 설계

## 목적

웹, Expo 앱, Spring Boot 백엔드를 하나의 통합 브랜치에서 관리하고, 캡스톤
시연에 필요한 실시간 채팅과 푸시 알림을 실제 데이터 흐름으로 완성한다. 첫 배포
대상은 Android 비공개 APK이며, iPhone은 Expo Go에서 핵심 흐름을 시연할 수 있는
상태를 완료 기준으로 삼는다.

## 저장소 통합

최종 소스 구조는 다음과 같다.

```text
SAVE/
├── src/                 웹 클라이언트
├── apps/save-app/       Expo 클라이언트
├── backend/             유일한 Spring Boot 백엔드
└── docs/                공통 문서
```

현재 `feature/item-time-rental-flow`와 `feature/expo-src-parity`는 같은 Git
저장소의 연결된 worktree다. 새 `integration/save-platform` 브랜치를 현재 웹
worktree에서 만들고 다음 순서로 통합한다.

1. 현재 미커밋 변경을 백엔드 보안, 웹 프론트 보강, 문서의 논리적 커밋으로 보존한다.
2. `feature/expo-src-parity`를 merge하여 `apps/save-app`과 모바일 인증을 가져온다.
3. `application.yml`, 루트 `package.json`, `vite.config.js`의 충돌은 양쪽 계약을
   모두 보존하도록 수동 해결한다.
4. 웹·Expo·백엔드 전체 검증이 끝날 때까지 기존 Expo worktree와 브랜치는 삭제하지
   않는다.

## STOMP 보안과 실시간 채팅

### 목적지 권한

STOMP 명령과 목적지를 분리한다.

- `SEND`: `/app/chats/rooms/{roomId}/messages`만 허용한다.
- `SUBSCRIBE`: `/topic/chats/rooms/{roomId}`만 허용한다.
- 개인 구독: `/user/queue/chat-list`, `/user/queue/notifications`만 허용한다.
- 모든 채팅방 명령은 인증된 참가자만 실행할 수 있다.
- `SEND /topic/...`, `SUBSCRIBE /app/...`, 임의 개인 큐와 알 수 없는 목적지는 거부한다.

### 메시지 조회와 연결 복구

- 기존 최근 메시지 조회는 유지하면서 `before` cursor로 이전 메시지를 조회할 수 있게
  확장한다.
- cursor는 마지막으로 받은 메시지의 식별자를 사용하고, 정렬과 페이지 경계에서
  중복이나 누락이 없도록 한다.
- 웹 STOMP 클라이언트는 재연결 시 활성 채팅방과 개인 큐를 다시 구독한다.
- 잘못된 JSON 프레임은 해당 프레임만 무시하고 연결을 유지한다.
- 중복 메시지 ID 캐시는 상한을 두어 장시간 연결에서 무한히 증가하지 않게 한다.
- 연결 중, 재연결, 오류 상태를 기존 UI 구조를 바꾸지 않는 중립 문구로 표시한다.
- 메시지 발신은 현재 REST 저장 후 STOMP 전파 흐름을 단일 기준으로 유지하고, 사용되지
  않는 클라이언트 STOMP 발신 경로는 제거한다.

현재 비공개 베타의 Cloud Run 최대 인스턴스는 1로 유지하므로 Spring simple broker를
사용한다. 다중 인스턴스와 외부 broker relay는 이번 범위에서 제외한다.

## Expo 채팅

Expo의 placeholder 채팅 탭을 실제 흐름으로 교체한다.

- 채팅방 목록, 마지막 메시지, 읽지 않은 개수를 백엔드에서 조회한다.
- 채팅방 상세 route를 추가하고 최근 메시지·이전 메시지 로딩을 제공한다.
- REST로 메시지를 저장하고 WebSocket으로 새 메시지·채팅방 요약을 수신한다.
- optimistic message, 실패 표시, 재전송, 중복 제거를 웹과 동일한 계약으로 구현한다.
- 앱이 foreground로 돌아오거나 연결이 복구되면 채팅방과 읽음 상태를 재동기화한다.
- 빈 상태와 오류 상태는 fixture를 만들지 않고 중립적으로 표시한다.

웹과 Expo가 공유하는 것은 백엔드 DTO/API 계약이며, UI 컴포넌트나 상태 코드를 억지로
공유하지 않는다.

## 푸시 알림

Expo SDK 57의 `expo-notifications`와 Expo Push Service를 사용한다.

### 앱

- Android/iOS 공통 알림 권한 요청과 Expo Push Token 발급을 구현한다.
- 토큰 변경을 감지해 백엔드에 다시 등록한다.
- 로그인 사용자와 토큰의 소유 관계를 유지하고 로그아웃 시 비활성화한다.
- foreground 알림 처리와 알림 클릭 처리를 구현한다.
- 채팅 알림 클릭 시 채팅방으로, 대여 알림 클릭 시 관련 화면으로 이동한다.
- 권한 거부와 토큰 발급 실패는 로그인이나 채팅 자체를 막지 않는다.

### 백엔드

- 기기 식별자를 Expo Push Token 계약으로 명확히 하고 유효성 검사를 추가한다.
- Firebase Admin 직접 전송을 Expo Push Service HTTP 전송으로 교체한다.
- 채팅 메시지뿐 아니라 기존 앱 내부 대여 알림 이벤트도 푸시에 연결한다.
- 트랜잭션 커밋 후 전송하며, 앱 핵심 요청은 푸시 실패 때문에 실패하지 않는다.
- ticket/receipt 오류를 기록하고 영구적으로 만료된 토큰을 비활성화한다.
- 비동기 executor와 전송 timeout을 설정하고 성공·실패를 운영 로그에서 구분한다.

서버용 Firebase 서비스 계정은 더 이상 앱 푸시 전송에 필요하지 않게 된다. Android의
FCM 및 iOS의 APNs 자격 증명은 Expo/EAS 알림 설정에서 관리한다.

## 배포와 시연 완료 기준

### Android

- EAS development build 또는 내부 배포 APK를 생성한다.
- 로그인, 상품, 채팅, foreground/background 푸시, 알림 클릭 이동을 실제 기기에서
  검증한다.
- 시연용 APK를 네트워크 장애 대비 수단으로 준비한다.

### iPhone

- App Store와 TestFlight 배포는 이번 범위에서 제외한다.
- Expo Go에서 QR로 앱을 열고 로그인, 상품 조회, 채팅의 핵심 흐름을 확인한다.
- iPhone에서 접근 가능한 Cloud Run HTTPS URL 또는 LAN 주소를 사용하며 Android
  emulator 전용 `10.0.2.2`를 사용하지 않는다.
- Google 로그인이 시연 환경에서 실패할 경우 사용할 이메일 시연 계정을 준비한다.
- iOS 운영 푸시와 App Store 서명 검증은 후속 작업으로 남긴다.

## 오류 처리

- REST와 WebSocket 오류는 사용자 동작을 막는 오류와 일시적 연결 오류를 구분한다.
- 채팅 재연결은 지수 backoff를 사용하고, 복구 후 서버 데이터를 다시 조회한다.
- 푸시 등록·전송 오류는 로그와 상태로 남기되 로그인·메시지 저장 트랜잭션을 되돌리지
  않는다.
- merge 중 기존 웹 보안 변경과 모바일 인증 변경 중 하나를 삭제하는 방식의 충돌 해결은
  허용하지 않는다.

## 테스트 전략

- 백엔드: STOMP 명령/목적지 거부, 참가자 권한, cursor 페이지 경계, 푸시 토큰 수명주기,
  ticket/receipt 실패를 단위·통합 테스트로 검증한다.
- 웹: 재연결 구독, malformed frame, bounded deduplication, cursor 병합, 연결 상태를
  Vitest로 검증한다.
- Expo: 채팅 목록·상세·발신·재시도·재연결·알림 클릭 route를 Jest로 검증한다.
- 전체 게이트: 웹 테스트/린트/build, 백엔드 Gradle 테스트, Expo 테스트/typecheck/lint,
  Android export/build를 모두 실행한다.
- 자동화로 대체할 수 없는 Android 푸시와 iPhone Expo Go 흐름은 시연 전 실제 기기
  체크리스트로 기록한다.

## 제외 범위

- App Store 또는 TestFlight 배포
- iOS 운영 푸시 실기기 승인
- Cloud Run 다중 인스턴스와 외부 STOMP broker
- 채팅 첨부 파일, 음성·영상 통화, 메시지 검색·삭제
- 기존 UI의 시각적 재설계
