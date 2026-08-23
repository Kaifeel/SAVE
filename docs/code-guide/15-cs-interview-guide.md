# 15. SAVE 프로젝트 기반 CS 면접 가이드

## 1분 프로젝트 소개 예시

“SAVE는 교내 사용자 간 물품 대여 서비스로 React와 Spring Boot로 구현했습니다. REST API로 물품·대여·후기를 처리하고 STOMP WebSocket으로 채팅과 앱 안 알림을 전달합니다. PostgreSQL/JPA를 사용하며 대여 상태 전환에는 비관적 잠금과 트랜잭션을 적용해 이중 대여를 방지했습니다. 인증은 짧은 JWT 액세스 토큰과 회전식 HttpOnly 리프레시 쿠키를 조합했고, 이미지 저장은 개발 로컬과 운영 S3 구현을 interface로 분리했습니다.”

직접 작성하지 않은 바이브 코딩 프로젝트라면 거짓으로 “전부 직접 설계했다”고 말하지 말고, “AI로 초안을 만들었고 이후 호출 흐름, 보안·동시성·테스트를 분석해 검증하고 개선했다”고 설명하는 편이 안전하다.

## 네트워크

### HTTP method와 status

- GET: 안전하고 멱등적인 조회
- POST: 생성/명령. 같은 요청 반복 시 여러 자원이 생길 수 있음
- PUT: 자원 전체 교체 의미, 보통 멱등
- PATCH: 일부 상태 변경
- DELETE: 삭제, 이 프로젝트는 soft delete
- 400 형식/업무 입력, 401 인증 필요, 403 권한 없음, 404 없음, 409 상태/중복 충돌, 502 upstream 실패, 503 기능 설정 없음

**예상 질문: 대여 거절이 왜 409인가?**

요청 형식은 맞지만 현재 Rental/Item 상태에서는 전환할 수 없어 자원 상태와 충돌하기 때문이다.

### REST와 WebSocket

REST는 request-response, cache/debug/확장이 단순하다. WebSocket은 지속 연결의 양방향 저지연 전송에 적합하다. SAVE는 영속 이력과 재동기화는 REST, 실시간 갱신은 WebSocket으로 나눈다.

### CORS와 SOP

Same-Origin Policy는 브라우저가 다른 origin 응답을 읽지 못하게 하는 정책이다. CORS는 서버가 허용 origin/method/header를 응답해 예외를 부여한다. CORS는 인증/인가 자체가 아니며 curl 같은 비브라우저 공격자를 막지 않는다.

## 운영체제·동시성

### Process, thread, async

브라우저와 서버는 별 process다. Spring 요청은 thread pool에서 처리된다. `@Async` 푸시는 별 executor thread에서 처리된다. JavaScript `async`는 새 OS thread를 만든다는 뜻이 아니라 Promise가 완료될 때 event loop가 continuation을 실행한다.

### Race condition

두 borrower가 동시에 AVAILABLE을 읽고 둘 다 Rental을 만들 수 있다. `findByIdForUpdate`가 item row lock을 획득해 확인과 변경을 직렬화한다. lock 순서를 일관되게 하지 않으면 deadlock 위험이 있다.

### 동기화와 처리량 trade-off

비관적 잠금은 정확성이 단순하지만 lock 대기 동안 connection/thread를 점유한다. 충돌이 드물면 version 기반 optimistic lock과 retry가 처리량에 유리할 수 있다.

## 데이터베이스

### Transaction과 ACID

- Atomicity: Rental 생성과 Item 상태 변경이 함께 성공/실패
- Consistency: FK/unique/check와 Service 상태 규칙
- Isolation: row lock으로 충돌 전환 분리
- Durability: commit한 알림/대여를 DB가 보존

### JPA와 ORM

ORM은 객체-관계 impedance mismatch를 mapping하고 CRUD 반복을 줄인다. SQL과 실행 계획이 사라지는 것은 아니다. LAZY N+1, dirty checking 시점, transaction 범위를 이해해야 한다.

### 정규화와 역정규화

대학/장소를 별도 테이블로 둔 것은 중복을 줄이는 정규화다. 채팅방 목록 응답에 마지막 메시지/unread count를 계산해 담는 것은 읽기 모델을 편하게 만드는 API 조합이며, 규모가 크면 별도 summary를 역정규화할 수도 있다.

## 자료구조·알고리즘

- `Map<Integer, Item>`: AI 반환 ID를 평균 O(1)로 후보 조회
- `LinkedHashSet`: 추천 중복 제거하면서 입력 순서 유지
- `Set` message IDs: 실시간/REST 중복 제거
- sorting/filtering: 현재 item list 일부는 메모리 O(n log n); 규모가 크면 DB index와 pagination
- UUID/random token: 충돌 가능성이 매우 낮은 식별/비밀값

**예상 질문: List에서 후보 ID를 매번 찾으면?**

추천 k개마다 최대 n개를 순회해 O(kn)이다. Map을 한 번 O(n)에 구성하면 이후 평균 O(k) 조회다.

## 객체지향과 설계 원칙

### SRP

Controller는 HTTP, Service는 업무, Repository는 DB 책임이다. `App.jsx`는 여러 책임이 몰린 반례/개선 지점이다.

### DIP와 Strategy/Adapter

`ObjectStorage`에 Service가 의존하고 Local/S3 구현을 profile로 바꾼다. `RecommendationAiPort`도 외부 OpenAI 구현을 추상화한다. 고수준 정책이 구체 SDK에 직접 묶이지 않는다.

### DTO

Entity와 API 계약을 분리해 민감 필드와 persistence 구조 노출을 막는다. 변환 코드가 늘고 중복 shape 관리 비용이 생긴다.

## 보안

### 해시와 암호화

해시는 단방향, 암호화는 키로 복호화 가능하다. 비밀번호는 BCrypt salt 포함 느린 해시, refresh token은 서버 비교용 SHA-256 해시, JWT는 HMAC 서명이지 암호화가 아니다.

### Access/Refresh token

짧은 access token은 DB 조회 없이 API 인증하지만 탈취 취소가 어렵다. refresh token은 HttpOnly cookie와 DB 회전/replay detection으로 session을 복구한다. 절대 만료를 유지해 매 rotation마다 session이 무한 연장되지 않는다.

### XSS, CSRF, CORS

- XSS: 공격 script가 같은 origin에서 실행. React escaping, CSP/security header, 안전한 URL 필요
- CSRF: browser가 cookie를 자동 첨부하는 점 악용. SameSite, Origin, CSRF token
- CORS: 다른 origin JS의 response 읽기 허용 정책. CSRF 방어와 동일하지 않음

## 프론트엔드

### 렌더링과 상태

state setter는 즉시 변수 자체를 바꾸지 않고 rerender를 예약한다. props는 아래로, event callback은 위로 흐른다. derived data는 별도 state로 중복 저장하지 않고 `useMemo` 계산을 선호한다.

### useEffect 질문

Effect는 렌더 결과를 외부 시스템과 동기화한다. cleanup으로 timer/socket/listener를 해제해야 memory leak와 중복 메시지를 막는다. dependency 누락은 stale closure, 불필요한 객체 dependency는 반복 연결을 만든다.

### 상태 관리 개선 질문

현재 server state는 custom Hook, auth는 Zustand다. 기능이 커지면 React Query류로 caching/invalidation/loading을 표준화하고 router로 URL 가능한 navigation을 만들 수 있다. 무조건 라이브러리를 늘리기보다 복잡성과 팀 규칙에 근거한다.

## 테스트

### 좋은 테스트

중요한 외부 동작을 명확한 조건으로 검증하고 결정적이며 빠르다. 대여 동시성처럼 구현 detail보다 보장해야 할 불변식을 검사한다.

### 테스트 피라미드

많은 빠른 단위 테스트, 적당한 통합 테스트, 적은 E2E가 일반적이다. SAVE는 frontend component/hook 단위와 backend integration이 많고 실제 browser E2E는 없다.

## 꼬리 질문과 개선 답변

### “가장 위험한 부분은?”

인증 cookie/origin과 대여 동시성이다. 현재 통합/동시성 테스트가 있지만 H2와 PostgreSQL lock 차이를 위해 Testcontainers 기반 PostgreSQL 테스트, refresh token 운영 모니터링을 추가할 수 있다.

### “확장하면 WebSocket은?”

내장 simple broker와 instance memory 연결은 단일 서버에 적합하다. 여러 서버면 sticky session 또는 공유 broker(RabbitMQ 등), user destination routing, Google login ticket 공유 저장소가 필요하다.

### “장애에도 알림을 보장하려면?”

현재 after-commit listener는 commit 전 전송 문제를 막지만 process가 commit 직후 죽으면 이벤트를 잃을 수 있다. 같은 transaction에 outbox row를 저장하고 worker가 재시도하며 idempotency key로 중복을 제어한다.

### “대량 데이터가 되면?”

ItemService의 메모리 filter/sort/page를 DB query/Pageable로 옮기고 필요한 복합 인덱스를 측정한다. chat cursor pagination, notification 보존 정책, S3 CDN, cache와 query observability를 추가한다.

## 스스로 답해야 할 체크리스트

- Controller/Service/Repository를 코드 예시로 30초 안에 설명 가능한가?
- 대여 동시 신청이 왜 한 건만 성공하는가?
- access token과 refresh cookie가 각각 어디에 있고 왜 그런가?
- WebSocket이 끊기면 DB 상태를 어떻게 회복하는가?
- 첫 후기를 숨기는 정책을 어떤 데이터/시간으로 판단하는가?
- AI가 가짜 item ID를 반환하면 어떻게 막는가?
- JPA dirty checking 때문에 `save(item)`이 없어도 UPDATE되는 이유는?
- `useEffect` cleanup이 빠지면 어떤 현상이 생기는가?
- 현재 코드의 개선점 하나를 장단점과 함께 말할 수 있는가?
