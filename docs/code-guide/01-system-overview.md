# 01. 시스템 전체 구조

## 기술 스택

| 영역 | 기술 | 프로젝트에서 하는 일 |
|---|---|---|
| 브라우저 UI | React 19, JSX | 화면을 컴포넌트로 렌더링 |
| 빌드/개발 서버 | Vite 8 | JSX 변환, 개발 서버, 환경변수 주입 |
| CSS | Tailwind CSS 4, `App.css` | 모바일 중심 반응형 스타일 |
| 전역 상태 | Zustand 5 | 액세스 토큰과 로그인 사용자 메모리 저장 |
| HTTP | 브라우저 `fetch` | `/api/v1` REST API 호출 |
| 실시간 통신 | STOMP over WebSocket | 채팅 메시지, 채팅방 목록, 알림 수신 |
| 서버 | Spring Boot 3.3, Java 17 | API, 보안, 트랜잭션, 비즈니스 규칙 |
| ORM | Spring Data JPA/Hibernate | Java Entity와 관계형 테이블 매핑 |
| DB | H2(dev), PostgreSQL(prod) | 영속 데이터 저장 |
| 스키마 변경 | Flyway(prod) | 버전이 붙은 SQL을 순서대로 적용 |
| 파일 | 로컬(dev), S3(prod) | 검증된 물품 이미지 저장 |
| 외부 서비스 | Google, Firebase, OpenAI | 로그인, 푸시, 물품 추천 |

## 저장소 구조

```text
SAVE/
├── src/                    React 운영 코드와 테스트
│   ├── api/                HTTP 전송과 응답 정규화
│   ├── chat/               STOMP 클라이언트
│   ├── components/         재사용 UI
│   ├── hooks/              비동기 로직과 state 묶음
│   ├── pages/              탭/페이지 UI
│   ├── store/              Zustand 로그인 state
│   ├── utils/              순수 함수
│   └── App.jsx             전체 화면·기능 조립
├── backend/
│   ├── src/main/java/com/save/
│   │   ├── security/       인증·인가
│   │   ├── item/           물품과 수령 장소
│   │   ├── rental/         대여 상태 머신
│   │   ├── chat/           채팅과 WebSocket
│   │   └── ...             나머지 도메인
│   └── src/main/resources/ 설정과 SQL
└── docs/code-guide/        이 학습 문서
```

## 백엔드 계층의 역할

예를 들어 `POST /api/v1/rentals` 요청은 다음처럼 흐른다.

1. `SecurityConfig`가 JWT를 검사한다.
2. `RentalController.create()`가 JWT subject와 요청 JSON을 받는다.
3. `@Valid`가 `RentalCreateRequest` 제약을 검사한다.
4. `RentalService.create()`가 물품 잠금, 권한, 날짜, 금액, 채팅방 관계를 검사한다.
5. `RentalRepository.save()`가 `Rental`을 저장한다.
6. `Item.changeStatus(REQUEST_PENDING)`이 물품 상태를 바꾼다.
7. 트랜잭션 커밋 시 Hibernate가 변경 SQL을 실행한다.
8. `InAppNotificationService`가 알림을 저장하고 커밋 후 WebSocket으로 보낸다.
9. `RentalResponse`가 JSON으로 직렬화된다.

### Controller

- URL과 HTTP method를 메서드에 연결한다.
- `@RequestBody`, `@PathVariable`, `@RequestParam`으로 입력을 받는다.
- `@AuthenticationPrincipal Jwt`에서 로그인 사용자 ID를 꺼낸다.
- 로직을 직접 길게 구현하지 않고 Service에 위임한다.

### Service

- 실제 업무 규칙을 담당한다.
- `@Transactional`로 여러 DB 변경을 하나의 원자적 작업으로 묶는다.
- 접근 권한, 상태 전환, 중복, 계산을 검사한다.
- 여러 Repository와 외부 Port를 조합한다.

### Repository

- `JpaRepository<Entity, ID>`를 상속해 기본 CRUD를 얻는다.
- 메서드 이름으로 쿼리를 만들거나 `@Query`로 JPQL을 작성한다.
- 동시성 제어가 필요한 조회에는 `@Lock(PESSIMISTIC_WRITE)`를 쓴다.

### Entity와 DTO

- Entity는 DB 테이블과 연결된 객체다. `Rental.returnItem()`처럼 데이터 불변식을 지키는 상태 변경도 가진다.
- Request record는 클라이언트 입력이다.
- Response record는 외부에 보낼 필드만 고른다. Entity 자체를 바로 반환하지 않아 비밀번호 해시나 지연 로딩 관계가 노출되는 것을 막는다.

## 프론트엔드 구조

`main.jsx`가 `ToastProvider`와 `App`을 DOM에 붙인다. `App.jsx`가 인증 상태, 현재 탭, 선택 물품, 모달을 조립하고 각 페이지에 props를 전달한다.

```text
main.jsx
  └─ ToastProvider
      └─ App.jsx
          ├─ useAuthStore
          ├─ useItems/useRentals/useChatRooms/...
          ├─ HomePage/SearchPage/ChatPage/MyPage
          ├─ ProductDetailPage
          └─ Modal components
```

라우팅 라이브러리는 없다. 일반 화면은 `activeTab` 문자열과 조건부 렌더링으로 전환하고, `/admin`만 `window.location.pathname`으로 판별한다. 규모가 커지면 React Router 도입을 고려할 수 있는 구조다.

## 데이터 형태가 두 번 바뀌는 이유

서버는 설정 때문에 `snake_case` JSON을 보낸다. 화면은 주로 `camelCase`를 사용한다.

```text
DB: pickup_location_id
Java: pickupLocationId
JSON: pickup_location_id
React 화면 객체: pickupLocationId
```

`src/api/normalizers.js`가 여러 서버 응답 모양을 화면의 통일된 모양으로 바꾼다. 호환성에는 유리하지만 허용 형태가 너무 많으면 계약 오류를 숨길 수 있다는 trade-off가 있다.

## 개발 모드와 운영 모드

- `application-dev.yml`: H2, `ddl-auto=update`, 개발 기준 데이터, 로컬 파일 저장
- `application-prod.yml`: PostgreSQL, Flyway, `ddl-auto=validate`, S3, Secure 쿠키
- 프론트 `USE_API`: API 사용 여부를 정한다. 꺼져 있으면 `INITIAL_ITEMS`와 화면 내부 mock을 사용한다.
- `VITE_*`는 빌드 시 브라우저 코드에 들어가므로 비밀값을 넣으면 안 된다.

## 오류 흐름

Service가 `BusinessException(HttpStatus, message)`을 던지면 `GlobalExceptionHandler`가 `{message, timestamp}` JSON으로 바꾼다. 프론트 `api/client.js`는 실패 응답을 `ApiError`로 바꾸고 Hook/Page가 toast 또는 오류 화면을 보여준다. 401이면 한 번 리프레시를 시도하고 실패하면 로그인 state를 지운다.

## 면접 연결

**Q. MVC에서 Repository가 Controller에 바로 연결되면 안 되나요?**

기술적으로 가능하지만 권한·상태·트랜잭션 규칙이 Controller에 섞인다. 이 프로젝트는 Controller를 HTTP 어댑터, Service를 use case, Repository를 영속성 어댑터로 분리해 테스트와 변경 범위를 줄인다.

**Q. 프론트와 백엔드를 분리한 이유는 무엇인가요?**

UI 렌더링 주기와 서버 트랜잭션 주기를 분리하고 JSON 계약으로 통신한다. 웹 외의 클라이언트도 같은 API를 사용할 수 있지만, 현재 저장소에는 별도 네이티브 모바일 클라이언트가 없다.
