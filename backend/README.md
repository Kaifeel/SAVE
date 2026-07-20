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

```http
POST /api/v1/auth/signup
Content-Type: application/json

{"email":"student@example.com","password":"password123","name":"홍길동","department":"컴퓨터공학과"}
```

```http
POST /api/v1/auth/login
Content-Type: application/json

{"email":"student@example.com","password":"password123"}
```

보호된 API에는 로그인 응답의 `accessToken`을 전달합니다.

```http
POST /api/v1/chats/rooms
Authorization: Bearer {accessToken}
Content-Type: application/json

{"itemId": 10}
```

```http
GET /api/v1/chats/rooms
Authorization: Bearer {accessToken}
```

운영 환경에서는 반드시 충분히 긴 무작위 `JWT_SECRET` 환경변수를 설정합니다.

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
