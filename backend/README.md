# SAVE chat room API

물품 상세 화면에서 채팅 버튼을 누르면 같은 물품/차용자/대여자 조합의 채팅방을 생성하거나 기존 방을 반환하는 Spring Boot API입니다.

## MVC 패키지 구조

```text
com.save.chat
├─ controller  # HTTP/WebSocket 요청을 받고 JSON 응답 반환
├─ service     # 채팅방·메시지 비즈니스 규칙과 트랜잭션
├─ repository  # JPA 데이터베이스 접근
├─ domain      # ChatRoom, ChatMessage 엔티티(Model)
├─ dto         # 요청/응답 JSON 모델(REST의 View 표현)
└─ config      # WebSocket 설정
```

REST API이므로 별도의 JSP/Thymeleaf 화면은 없으며, Controller가 반환하는 응답 DTO가 JSON으로 변환되어 View 역할을 합니다.

## API

REST API Base URL은 `/api/v1`입니다.

### 회원가입과 로그인

비밀번호는 BCrypt 해시로만 저장되며 로그인 성공 시 1시간 유효한 JWT를 반환합니다.
회원가입, 일반 로그인 및 Google 로그인은 정확히 `@pukyong.ac.kr` 도메인인
부경대학교 이메일만 허용합니다.

```http
POST /api/v1/auth/signup
Content-Type: application/json

{"email":"student@pukyong.ac.kr","password":"password123","name":"홍길동",
 "department":"컴퓨터공학과","university_id":1}
```

```http
POST /api/v1/auth/login
Content-Type: application/json

{"email":"student@pukyong.ac.kr","password":"password123"}
```

보호된 API에는 로그인 응답의 `access_token`을 전달합니다.

```http
POST /api/v1/chats/rooms
Authorization: Bearer {accessToken}
Content-Type: application/json

{"item_id": 10}
```

```http
GET /api/v1/chats/rooms
Authorization: Bearer {accessToken}
```

운영 환경에서는 반드시 충분히 긴 무작위 `JWT_SECRET` 환경변수를 설정합니다.

### 대학, 수령 장소와 물품

대학과 수령 장소는 자유 문자열이 아닌 기준 데이터입니다. 비로그인 사용자도 선택 목록을
조회할 수 있고, 등록은 `ADMIN`만 할 수 있습니다.

```http
GET /api/v1/universities
GET /api/v1/universities/{universityId}/pickup-locations
POST /api/v1/admin/universities
POST /api/v1/admin/universities/{universityId}/pickup-locations
```

물품 등록은 다음처럼 정규화된 ID와 대여 전용 명칭을 사용합니다.

```http
POST /api/v1/items
Authorization: Bearer {access_token}
Content-Type: application/json

{"title":"우산","type":"LEND","rental_fee":1000,"rental_unit":"DAY",
 "pickup_location_id":1,"description":"깨끗한 우산입니다."}
```

첫 대여 요청은 물품 행을 잠근 뒤 물품을 `AVAILABLE → REQUEST_PENDING`으로 바꿉니다.
따라서 같은 물품에는 먼저 들어온 하나의 활성 요청만 생성됩니다. 게시물 주인이 승인하면
물품은 `RESERVED`, 거절하거나 요청자가 승인 전에 취소하면 다시 `AVAILABLE`이 됩니다.

대여 기록 상태는 `REQUESTED → APPROVED → PAID → RENTING → RETURNED` 순서로 진행되고,
물품 상태는 대여 시작 시 `RENTED`, 반납 완료 시 `AVAILABLE`로 바뀝니다. 게시물 상세의
일반 상태 변경 API로 이 흐름을 우회할 수 없습니다.
실서비스에서 `PAID` 처리는 사용자 직접 호출 대신 결제사 웹훅 검증으로 교체해야 합니다.

## 실행 및 테스트

프로젝트에 Gradle Wrapper가 포함되어 있으므로 Gradle을 별도로 설치할 필요가 없습니다. JDK 17 이상만 설치합니다.

```powershell
.\gradlew.bat test
.\gradlew.bat bootRun
```

macOS/Linux에서는 다음과 같이 실행합니다.

```bash
chmod +x gradlew
./gradlew test
./gradlew bootRun
```

처음 실행할 때 Wrapper가 Gradle 8.13을 자동으로 내려받으므로 인터넷 연결이 한 번 필요합니다.

### Docker 실행

Java를 직접 설치하지 않는 환경에서는 Docker로 실행할 수 있습니다.

```bash
docker build -t save-chat-api .
docker run --rm -p 8080:8080 save-chat-api
```

Firebase까지 사용할 경우 서비스 계정 파일을 이미지에 포함하지 말고 실행 시 읽기 전용으로 마운트합니다.

```powershell
docker run --rm -p 8080:8080 `
  -e FIREBASE_ENABLED=true `
  -e FIREBASE_CREDENTIALS_PATH=/run/secrets/firebase.json `
  -v "C:\secrets\firebase-service-account.json:/run/secrets/firebase.json:ro" `
  save-chat-api
```

React에서는 `POST http://localhost:8080/api/v1/chats/rooms` 호출 결과의 `roomId`, `itemTitle`, `lenderName`을 채팅방 상태에 매핑하면 됩니다.

## 메시지 및 실시간 채팅 API

```http
POST /api/v1/chats/rooms/{roomId}/messages  # 메시지 저장 및 실시간 전송
GET /api/v1/chats/rooms/{roomId}/messages?size=50  # 최근 메시지 조회
PATCH /api/v1/chats/rooms/{roomId}/read  # 상대방의 안 읽은 메시지 읽음 처리
GET /api/v1/chats/rooms  # 마지막 메시지와 unreadCount가 포함된 내 채팅방 목록
```

WebSocket STOMP 연결 주소는 `/ws-chat`입니다.

- 발행: `/app/chats/rooms/{roomId}/messages`
- 구독: `/topic/chats/rooms/{roomId}`
- STOMP `CONNECT` 헤더: `Authorization: Bearer {accessToken}`

REST와 WebSocket 모두 JWT로 사용자를 식별하며, 채팅방 참여자만 메시지에 접근할 수 있습니다.

## 앱 안 대여 알림 API

대여 요청, 승인, 거절 알림은 데이터베이스에 저장됩니다. 로그인한 사용자는 자신의 최근
알림만 조회하거나 읽음 처리할 수 있습니다.

```http
GET /api/v1/notifications
GET /api/v1/notifications/unread-count
PATCH /api/v1/notifications/{notificationId}/read
PATCH /api/v1/notifications/read-all
```

새 알림은 데이터베이스 트랜잭션이 커밋된 뒤 개인 STOMP 목적지
`/user/queue/notifications`로 전달됩니다. 현재 앱 안 알림 유형은
`RENTAL_REQUESTED`, `RENTAL_APPROVED`, `RENTAL_REJECTED`입니다. Firebase 앱 밖
푸시 알림과는 별개이며, 대여 상태 앱 밖 푸시는 아직 이 흐름에 연결하지 않았습니다.

## Firebase Cloud Messaging 설정

### 1. Firebase 콘솔

1. Firebase Console에서 프로젝트를 생성합니다.
2. React Native Android 앱을 등록하고 `google-services.json`을 `android/app/`에 둡니다.
3. iOS도 사용한다면 iOS 앱 등록 후 `GoogleService-Info.plist`를 Xcode 프로젝트에 추가하고 APNs 키를 Firebase에 등록합니다.
4. 프로젝트 설정 → 서비스 계정 → Firebase Admin SDK → 새 비공개 키 생성으로 서버용 JSON을 받습니다.

서비스 계정 JSON은 앱이나 Git 저장소에 넣으면 안 됩니다. 서버의 안전한 위치에 보관합니다.

### 2. Spring Boot 환경변수

```powershell
$env:FIREBASE_ENABLED = 'true'
$env:FIREBASE_CREDENTIALS_PATH = 'C:\secrets\firebase-service-account.json'
.\bootRun.ps1
```

환경변수가 없거나 `FIREBASE_ENABLED=false`이면 채팅 기능은 정상 동작하고 푸시만 생략됩니다.

### 3. React Native 토큰 등록

React Native에서 알림 권한을 받은 뒤 FCM 토큰을 백엔드에 등록합니다.

```javascript
import messaging from '@react-native-firebase/messaging'

export async function registerPushToken(apiUrl, accessToken) {
  await messaging().requestPermission()
  const token = await messaging().getToken()

  const response = await fetch(`${apiUrl}/api/v1/device-tokens`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ token, platform: 'ANDROID' }),
  })
  if (!response.ok) throw new Error('FCM 토큰 등록 실패')
}
```

토큰 갱신 시 새 토큰을 다시 등록합니다.

```javascript
const unsubscribe = messaging().onTokenRefresh(token => {
  fetch(`${API_URL}/api/v1/device-tokens`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ token, platform: 'ANDROID' }),
  })
})
```

로그아웃할 때는 현재 토큰을 비활성화합니다.

```http
DELETE /api/v1/device-tokens?token={FCM_TOKEN}
Authorization: Bearer {accessToken}
```

메시지가 DB에 성공적으로 커밋된 후 수신자의 활성 기기 전체로 알림이 전송됩니다. FCM이 `UNREGISTERED`를 반환한 토큰은 자동으로 비활성화됩니다.

## 운영 환경 체크리스트

운영 실행 시 `SPRING_PROFILES_ACTIVE=prod`를 설정하고 다음 값을 비밀 저장소나
배포 플랫폼의 환경 변수로 주입합니다. `.env`와 실제 인증 정보는 커밋하지 않습니다.

```dotenv
DB_URL=jdbc:postgresql://db-host:5432/save
DB_USERNAME=save
DB_PASSWORD=...
JWT_SECRET=... # 32자 이상의 충분히 긴 무작위 값
CORS_ALLOWED_ORIGINS=https://save.example
OPENAI_API_KEY=...
S3_REGION=ap-northeast-2
S3_BUCKET=save-item-images
S3_PUBLIC_BASE_URL=https://cdn.save.example
```

S3 호환 서비스에 별도 endpoint나 정적 자격 증명이 필요한 경우에만
`S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`,
`S3_PATH_STYLE_ACCESS_ENABLED`를 설정합니다. AWS 역할 기반 환경에서는 액세스 키를
비워 SDK 기본 자격 증명 체인을 사용합니다.

운영 프로필은 PostgreSQL 스키마를 Flyway로 관리하고 Hibernate는 검증만 수행합니다.
직접 `PAID` 상태로 전환하는 개발용 API는 비활성화됩니다. 헬스체크는
`/actuator/health`, 배포 정보는 `/actuator/info`만 노출하며 상세 내부 정보는
응답하지 않습니다.

요청과 응답에는 `X-Correlation-ID`가 전달되므로 애플리케이션·프록시·DB 로그에서
같은 ID를 연결해 장애를 추적합니다. 토큰, 비밀번호, OpenAI/S3 키, 채팅 본문과
개인정보는 로그에 기록하지 않습니다.

출시 전에 다음 운영 절차를 별도로 확정해야 합니다.

- PostgreSQL 자동 백업, 복구 리허설, 보존 기간
- 오류율·응답 시간·DB 연결·스토리지 용량 알림
- 사용자 데이터 보존/삭제 정책과 개인정보 처리방침
- 관리자 제재 이력과 민감정보 접근 감사
- 키 교체 절차와 사고 대응 연락 체계
