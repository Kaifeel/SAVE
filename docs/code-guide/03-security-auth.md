# 03. 인증과 보안 도메인

## 패키지 역할

`security`는 회원가입/로그인, Google 인증, JWT 발급, 리프레시 토큰 회전, 쿠키, CORS/Origin, 정지 사용자 차단을 담당한다.

## 이메일 회원가입 흐름

```text
LoginPage.handleSubmit
→ signUpWithEmail
→ POST /api/v1/auth/signup
→ AuthController.signUp
→ AuthService.signUp
   → PknuEmailPolicy.requireAllowed
   → UserRepository.existsByEmailIgnoreCase
   → PasswordEncoder.encode
   → User.local/updateProfile
   → UserRepository.save
   → JwtTokenService.issue
→ AuthSessionService.start
   → RefreshTokenService.issue
→ RefreshCookieService.write
→ AuthResponse JSON + HttpOnly 쿠키
```

`SignUpRequest`는 이메일, 8~72자 비밀번호, 이름, 학과, 대학 ID를 검증한다. BCrypt는 입력을 72바이트까지만 의미 있게 처리하므로 `validateBcryptLength()`가 UTF-8 바이트 길이도 검사한다. `PknuEmailPolicy`는 정확한 `@pukyong.ac.kr` 도메인만 허용하고 look-alike 문자열을 거부한다.

## 로그인과 JWT

`AuthService.login()`은 이메일로 User를 찾고 `PasswordEncoder.matches()`로 평문 입력과 해시를 비교한다. 성공하면 `JwtTokenService.issue()`가 subject에 사용자 ID, role 등 claim과 만료 시각을 넣어 서명한다.

액세스 토큰은 기본 15분이며 프론트 Zustand 메모리에만 둔다. `localStorage`에 없으므로 XSS가 장기간 토큰을 훔칠 표면을 줄이지만 새로고침하면 사라진다. 이를 HttpOnly 리프레시 쿠키가 보완한다.

## 리프레시 토큰 회전

- `RefreshTokenService.issue(User)`: 32바이트 난수 raw token과 가족 UUID를 만든다.
- `hash(rawToken)`: SHA-256 해시만 DB에 저장한다.
- `rotate(rawToken)`: 행을 쓰기 잠금으로 조회하고 유효성 검사 후 기존 토큰을 consumed 처리하고 같은 절대 만료의 새 토큰을 발급한다.
- 이미 consumed/revoked된 토큰이 다시 오면 replay로 판단해 같은 family 전체를 폐기한다.
- `revokeFamily(rawToken)`: 로그아웃 시 가족 전체를 폐기한다.

`@Transactional(noRollbackFor = BusinessException.class)`은 replay를 감지해 예외를 던져도 가족 폐기 UPDATE가 롤백되지 않게 한다. 보안 상태 변경이 예외보다 먼저 영속되어야 하기 때문이다.

`RefreshCookieService`는 설정된 이름·path·Secure·SameSite/HttpOnly 속성으로 쿠키를 읽고 쓰고 지운다. 현재 작업 트리 기준 `/refresh`와 `/logout`은 `AuthOriginValidator`로 정확한 Origin도 확인하며 `Cache-Control: no-store`를 설정한다.

## 401 자동 복구

`src/api/client.js`의 `request()`는 보호 API가 401을 반환하면 한 번만 `refreshAuthSession()`을 실행하고 새 토큰으로 원 요청을 재시도한다. `refreshPromise`를 공유하므로 동시에 여러 요청이 401이어도 refresh 폭주를 막는다(single-flight). refresh도 실패하면 Zustand session을 지우고 unauthorized listener가 `App`을 로그인 화면으로 돌린다.

## Google 로그인 두 경로

1. `POST /auth/google`: JS가 Google ID token을 직접 보내는 방식
2. Google redirect POST:
   - `/auth/google/redirect`가 Google의 credential과 double-submit CSRF token을 검증
   - `GoogleOAuthService.login()`이 Google token의 audience/email을 검증
   - `GoogleLoginTicketService.issue()`가 60초짜리 일회용 code를 메모리에 저장
   - 브라우저를 `#google_login_code=...`로 돌려보냄
   - 프론트가 `/auth/google/exchange`로 code 교환

URL fragment는 서버로 자동 전송되지 않는다. 액세스 토큰을 URL에 직접 넣지 않고 짧은 일회용 code만 전달해 기록과 referrer 노출을 줄인다. `ConcurrentHashMap`은 단일 서버 메모리이므로 서버가 여러 대면 Redis 같은 공유 저장소가 필요하다.

## SecurityConfig의 역할

- Stateless API와 OAuth2 Resource Server JWT 검증 설정
- 공개 endpoint와 인증 필요 endpoint 구분
- `/api/v1/admin/**` 및 method security의 ADMIN 권한
- CORS 허용 origin/method/header 설정
- BCrypt `PasswordEncoder`
- HMAC JWT encoder/decoder
- 브라우저 보안 header 설정
- `SuspendedUserFilter`를 JWT 인증 뒤 배치

`SuspendedUserFilter.doFilterInternal()`은 인증된 JWT subject로 User를 조회하고 정지 상태면 요청을 거부한다. `parseUserId()`는 잘못된 subject가 필터 전체를 깨뜨리지 않도록 안전하게 변환한다.

## 파일과 기능성 메서드

| 파일 | 핵심 메서드/역할 |
|---|---|
| `AuthController` | `google`, `googleRedirect`, `exchangeGoogleLogin`, `signUp`, `login`, `refresh`, `logout`, `startSession`, `preventCaching`, `requireMatchingCsrfToken` |
| `AuthService` | `signUp`, `login`, 응답/JWT 생성과 BCrypt 길이 검증 |
| `AuthSessionService` | `start`, `refresh`, `logout`: 액세스·리프레시 수명주기 조립 |
| `JwtTokenService` | `issue`, `getExpirationSeconds` |
| `RefreshTokenService` | `issue`, `rotate`, `revokeFamily`, 난수 생성, 해시, 조회 |
| `RefreshCookieService` | request에서 읽기, response에 쓰기/삭제 |
| `GoogleOAuthService` | Google ID token 검증, 기존/신규 User 처리 |
| `GoogleLoginTicketService` | `issue`, `consume`, `removeExpired` |
| `PknuEmailPolicy` | 이메일 normalize 및 학교 도메인 제한 |
| `AuthOriginValidator` | 설정 origin 집합 구성, `requireAllowed` |
| `ProductionSecretsValidator` | prod JWT secret 길이/기본값/Secure 쿠키 검증 |
| `SecurityConfig` | `SecurityFilterChain`, encoder/decoder, CORS 등의 Bean 생성 |
| `SuspendedUserFilter` | 매 요청에서 정지 사용자 차단 |
| `RefreshToken` | consumed/revoked/expired 상태와 변경 메서드 |
| request/response record | JSON 계약. record 접근자는 자동 생성 |

## 보안 CS 면접 포인트

**Authentication과 Authorization:** 로그인하여 누구인지 증명하는 것이 인증, ADMIN이나 대여 참여자인지 확인해 행동을 허용하는 것이 인가다.

**쿠키와 CSRF:** 브라우저가 쿠키를 자동 전송하므로 공격 사이트가 요청을 유도할 수 있다. SameSite와 Origin 검증, Google redirect의 CSRF token이 방어 계층이다.

**JWT trade-off:** 서버가 액세스 세션을 매번 조회하지 않아 수평 확장에 유리하지만 발급 후 즉시 취소하기 어렵다. 이 프로젝트는 짧은 액세스 만료와 DB 기반 회전 리프레시 토큰을 조합한다.

**XSS:** HttpOnly 쿠키는 JS로 읽을 수 없지만 XSS가 사용자 권한으로 요청을 보내는 것까지 막지는 못한다. React의 기본 문자열 escaping, 보안 header, 입력·출력 정책이 함께 필요하다.
