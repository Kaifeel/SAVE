# 02. Java와 Spring 기초 및 어노테이션

## 먼저 알아야 할 Java 문법

### class, interface, record, enum

- `class`: 필드와 동작을 가진 일반 객체. `RentalService`, `User`, `Item`이 예다.
- `interface`: 구현이 지켜야 할 계약. `ObjectStorage.store()`를 로컬과 S3 구현이 각각 구현한다.
- `record`: 변경하지 않는 데이터 묶음. 생성자, 필드 접근자, `equals/hashCode/toString`을 컴파일러가 만든다. `LoginRequest.email()`처럼 `getEmail()`이 아닌 컴포넌트 이름으로 읽는다.
- `enum`: 허용 값이 고정된 타입. `RentalStatus.REQUESTED`처럼 잘못된 문자열 상태를 줄인다.

### 접근 제한자와 주요 키워드

| 문법 | 뜻 | 코드 예시 |
|---|---|---|
| `public` | 어디서나 접근 | Controller endpoint |
| `private` | 해당 클래스 내부만 | 검증 helper, 의존성 필드 |
| `protected` | 같은 패키지/하위 클래스 | JPA용 빈 생성자 |
| `final` | 다시 대입/상속 불가 | 주입받은 Repository 필드 |
| `static` | 객체가 아닌 클래스 소속 | `Response.from(entity)` |
| `extends` | 클래스 상속 | Filter, RuntimeException |
| `implements` | interface 구현 | `ObjectStorage`, `WebMvcConfigurer` |
| `var` | 컴파일러가 지역 타입 추론 | Repository 결과 임시 변수 |
| `Optional<T>` | 값이 없을 수 있음 | `findById()` 결과 |
| Stream | 컬렉션 변환 파이프라인 | `stream().filter().map().toList()` |

### 자주 보이는 함수 형태

```java
public RentalResponse detail(Integer rentalId, Integer userId) {
    return response(findAccessible(rentalId, userId), userId);
}
```

- 반환 타입: `RentalResponse`
- 함수 이름: `detail`
- 매개변수: 두 `Integer`
- `return`: 호출자에게 결과를 돌려준다.
- 같은 클래스의 `findAccessible`, `response`를 안쪽부터 실행한다.

람다 `item -> item.getStatus() == AVAILABLE`은 이름 없는 함수다. 메서드 참조 `ItemResponse::from`은 “각 값을 `ItemResponse.from`에 넣어라”라는 축약이다.

## Spring Core 어노테이션

| 어노테이션 | 의미와 이 프로젝트의 사용 |
|---|---|
| `@SpringBootApplication` | 자동 설정, 컴포넌트 스캔, 실행 진입점을 합친다. `SaveChatApiApplication`에 사용 |
| `@Component` | Spring이 생성·관리할 일반 객체 |
| `@Service` | 비즈니스 로직 컴포넌트. 의미상 Component의 특수형 |
| `@Configuration` | Bean 설정 클래스 |
| `@Bean` | 메서드 반환 객체를 Spring 컨테이너에 등록 |
| `@Autowired` | 생성자 선택을 명시. 생성자가 하나면 보통 생략 가능 |
| `@Value("${...}")` | yml/환경변수 설정값 주입 |
| `@ConfigurationProperties(prefix="storage")` | `storage.*` 설정을 객체 필드에 일괄 바인딩 |
| `@Profile("prod")` | 특정 실행 프로필에서만 Bean 활성화. S3는 prod, 로컬 저장은 !prod |
| `@ConditionalOnProperty` | 설정값이 조건을 만족할 때만 Bean 생성. Firebase에 사용 |
| `@Primary` | 같은 타입 Bean이 여러 개일 때 기본 선택 |
| `@PostConstruct` | 생성과 주입이 끝난 직후 한 번 실행. 운영 비밀값 검증 |
| `@EnableAsync` / `@Async` | 별도 실행기에서 비동기 메서드 수행 |
| `@EnableScheduling` / `@Scheduled` | 주기적 작업 활성화/등록. 만료된 제재 해제 |
| `@Order` | Filter/컴포넌트 적용 우선순위. Correlation ID filter를 가장 먼저 실행 |
| `@Override` | 상위 클래스/interface 메서드를 정확히 재정의한다고 컴파일러에 알림 |
| `@JsonInclude` | Jackson JSON에 null 등 어떤 값을 포함할지 제어 |

의존성 주입(DI)은 `new RentalRepository()`를 직접 하지 않고 생성자로 필요한 객체를 선언하는 방식이다. Spring 컨테이너가 구현 객체를 찾아 전달한다. 테스트에서는 가짜 구현이나 mock을 넣기 쉬워진다.

## Spring MVC 어노테이션

| 어노테이션 | 역할 |
|---|---|
| `@RestController` | 메서드 반환값을 JSON 응답으로 만드는 Controller |
| `@Controller` | 주로 View/redirect를 반환하는 Controller |
| `@RequestMapping` | 클래스 또는 메서드의 공통 URL/조건 |
| `@GetMapping` | 조회 HTTP GET |
| `@PostMapping` | 생성/명령 HTTP POST |
| `@PutMapping` | 자원 전체 수정 HTTP PUT |
| `@PatchMapping` | 상태 등 일부 수정 HTTP PATCH |
| `@DeleteMapping` | 삭제 HTTP DELETE |
| `@RequestBody` | JSON body를 Java 객체로 역직렬화 |
| `@ModelAttribute` | form/multipart 필드를 객체로 바인딩 |
| `@PathVariable` | `/items/{itemId}`의 값을 받음 |
| `@RequestParam` | `?page=0` 또는 form 필드를 받음 |
| `@RequestHeader` | HTTP header를 받음 |
| `@CookieValue` | 쿠키 하나를 받음 |
| `@ResponseStatus` | 성공 응답 status 지정(201, 204 등) |
| `@RestControllerAdvice` | 모든 REST Controller에 적용되는 공통 처리 |
| `@ExceptionHandler` | 특정 예외를 응답으로 변환 |

## 검증 어노테이션

`@Valid`가 붙은 요청 객체 안에서 아래 제약을 실행한다.

| 어노테이션 | 검사 |
|---|---|
| `@NotNull` | null 금지 |
| `@NotBlank` | null, 빈 문자열, 공백 문자열 금지 |
| `@NotEmpty` | 빈 컬렉션/문자열 금지 |
| `@Email` | 이메일 형식 |
| `@Size(min,max)` | 문자열/컬렉션 길이 |
| `@Min`, `@Max` | 숫자 범위 |
| `@Pattern(regexp=...)` | 정규식 일치 |
| `@AssertTrue` | boolean 검증 메서드가 true여야 함 |

형식 검증과 업무 검증은 다르다. `@NotNull itemId`는 입력 형식을 검사하지만 “그 물품이 존재하고 대여 가능한가”는 Service가 검사한다.

## JPA 어노테이션

| 어노테이션 | 역할 |
|---|---|
| `@Entity` | DB에 저장되는 JPA 객체 |
| `@Table` | 테이블 이름, unique constraint, index 지정 |
| `@Id` | 기본키 |
| `@GeneratedValue(IDENTITY)` | DB identity가 ID 생성 |
| `@Column` | 열 이름, null, 길이, 수정 가능 여부 |
| `@Enumerated(STRING)` | enum을 순서 숫자가 아닌 이름 문자열로 저장 |
| `@ManyToOne` | 여러 물품이 한 사용자에 속하는 관계 등 |
| `@OneToMany` | 한 물품이 여러 이미지 보유 |
| `@ManyToMany` | 추천과 여러 물품의 연결 |
| `@JoinColumn` | 외래키 열 지정 |
| `@JoinTable` | 다대다 중간 테이블 지정 |
| `@ElementCollection` | 별도 Entity ID가 없는 값 목록 저장 |
| `@CollectionTable` | ElementCollection 테이블 지정 |
| `@OrderColumn` | 목록 순서를 열에 저장 |
| `@OrderBy` | 조회 결과 정렬 |
| `@PrePersist` | INSERT 직전 실행 |
| `@PreUpdate` | UPDATE 직전 실행 |
| `@UniqueConstraint` | 중복 방지 DB 제약 |
| `@Index` | 검색용 DB 인덱스 선언 |

`fetch = LAZY`는 관계 객체를 실제 사용할 때 조회한다. `open-in-view=false`이므로 Service 트랜잭션 밖에서 지연 관계를 읽으면 오류가 날 수 있다. 따라서 `@EntityGraph`나 `join fetch`로 필요한 관계를 함께 조회한다.

## Repository와 트랜잭션 어노테이션

- `@Transactional`: 성공하면 커밋, unchecked exception이면 롤백한다.
- `readOnly=true`: 읽기 의도를 알리고 불필요한 변경 감지를 줄인다.
- `noRollbackFor=BusinessException.class`: 해당 예외가 나도 토큰 가족 폐기 같은 보안 변경을 커밋해야 할 때 사용한다.
- `@Query`: 메서드 이름으로 표현하기 어려운 JPQL/수정 쿼리다.
- `@Param`: JPQL의 `:name`과 매개변수를 연결한다.
- `@Lock(PESSIMISTIC_WRITE)`: 다른 트랜잭션의 충돌 변경을 직렬화한다.
- `@Modifying`: SELECT가 아닌 update/delete JPQL임을 표시한다.
- `@EntityGraph`: 연관 Entity를 한 번에 fetch해 N+1과 지연 로딩 문제를 줄인다.

## Security/WebSocket/Event 어노테이션

- `@EnableMethodSecurity`, `@PreAuthorize("hasRole('ADMIN')")`: 메서드 권한 검사
- `@AuthenticationPrincipal Jwt`: 검증된 JWT principal 주입
- `@EnableWebSocketMessageBroker`: STOMP broker 기능 활성화
- `@MessageMapping`: HTTP URL 대신 STOMP 발행 destination 연결
- `@DestinationVariable`: destination의 `{roomId}` 추출
- `@TransactionalEventListener(AFTER_COMMIT)`: DB 커밋 성공 뒤 이벤트 처리. 롤백된 알림이 전송되는 일을 막는다.

## 테스트 어노테이션 요약

- `@Test`, `@BeforeEach`, `@AfterEach`: 테스트와 전후 준비
- `@SpringBootTest`: 전체 Spring context 통합 테스트
- `@DataJpaTest`: JPA 부분만 실행
- `@AutoConfigureMockMvc`: 서버 포트를 열지 않고 MVC 요청 테스트
- `@ExtendWith`: JUnit 확장 등록, Mockito 연결 등에 사용
- `@Mock`: 가짜 의존성
- `@TempDir`: 테스트 전용 임시 디렉터리
- `@DirtiesContext`: 테스트 뒤 Spring context 폐기
- `@TestConfiguration`, `@Import`, `@Primary`: 테스트용 Bean 교체

## 면접 연결

**Q. IoC와 DI의 차이는?**

IoC는 객체 생성과 실행 제어권이 애플리케이션 코드에서 프레임워크로 넘어간 원칙이다. DI는 그 IoC를 구현하기 위해 객체가 필요한 의존성을 외부에서 전달받는 방식이다. 이 프로젝트의 생성자 주입이 구체적 사례다.

**Q. record를 DTO로 사용한 이유는?**

DTO는 보통 값 전달이 목적이고 변경 동작이 필요 없다. record는 불변에 가까운 표현, 자동 접근자와 값 동등성을 제공해 보일러플레이트를 줄인다.
