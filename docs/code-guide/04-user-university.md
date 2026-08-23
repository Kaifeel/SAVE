# 04. 사용자와 대학교 도메인

## User Entity

`User`는 `users` 테이블과 연결된다. 이메일, 이름, 학과, 프로필 이미지, 비밀번호 해시/OAuth 정보, role, status, 제재 만료와 사유, 생성·수정 시각을 가진다.

- `local(...)`: 로컬 비밀번호 계정을 만드는 static factory
- 전체 필드 생성자: Google 인증에서 신규 사용자를 만들 때 provider/subject를 전달
- `linkGoogleAccount(...)`: 기존 로컬 계정에 Google subject와 프로필 이미지를 연결
- `updateProfile(...)`: 이름·학과·대학·이미지 갱신
- `sanction(until, reason)`: 사용자를 `SUSPENDED`로 바꾸고 만료 시각·사유 저장
- `@PrePersist/@PreUpdate`: timestamp 설정
- getter: Service/Response가 필드를 읽도록 제공

`UserRole`은 `USER`, `ADMIN`; `UserStatus`는 활성/정지 상태를 표현한다. 문자열 상수보다 enum을 쓰면 컴파일 시 허용 상태를 제한할 수 있다.

## 내 프로필 흐름

```text
ProfileSetupPage
→ App.handleCompleteProfile
→ api/users.updateMyProfile
→ UserController.update
→ UserService.updateProfile
→ UserRepository.findById
→ UniversityRepository.findById
→ User.updateProfile
→ UserResponse.from
→ Zustand updateUser
```

`UserProfileUpdateRequest`가 이름/학과/대학 ID/이미지 URL을 검증한다. Service는 대학 ID가 실제 기준 데이터인지 확인한다. 응답은 `UserResponse`로 제한한다.

## 공개 프로필

`PublicUserController`는 로그인한 사용자가 다른 사용자의 공개 정보와 게시 물품을 조회하게 한다.

- `GET /api/v1/users/{userId}/profile`
- `GET /api/v1/users/{userId}/items`
- `GET /api/v1/users/{userId}/reviews`

`PublicUserProfileResponse`에는 이름, 학과, 대학, 이미지, 평균 평점, 후기 수, 완료 거래 수만 있다. 이메일, 해시, OAuth ID, role은 없다. 공개 DTO 분리는 최소 권한과 정보 노출 방지의 사례다.

평균 평점/후기 수는 공개 가능한 Review만 집계하고 완료 거래 수는 lender의 `RETURNED` Rental 수를 센다. 물품 목록은 삭제 상태를 숨긴다.

## UserRepository

메서드 이름을 Spring Data가 해석한다.

- `findByEmailIgnoreCase`: 대소문자를 무시하고 이메일 조회
- `existsByEmailIgnoreCase`: 중복 존재 여부만 조회
- OAuth provider/id 기반 조회: Google 계정 재로그인 식별
- 만료 제재 대상 조회: scheduler가 복구할 사용자 선택

복잡한 관계가 필요하면 `@EntityGraph`를 사용한다. 이는 `User.university`를 트랜잭션 밖에서 읽을 때 생길 수 있는 LAZY 문제와 추가 쿼리를 줄인다.

## 제재 자동 해제

`ExpiredSanctionScheduler.releaseExpiredSanctions()`는 `@Scheduled`로 주기 실행된다. Entity를 하나씩 읽지 않고 `UserRepository.releaseExpiredSanctions(now)`의 `@Modifying` bulk JPQL이 만료된 정지 사용자를 한 번에 `ACTIVE`로 바꾸고 제재 정보를 null로 만든다. `clearAutomatically/flushAutomatically`는 bulk query 전후 영속성 context와 DB 상태 불일치를 줄인다.

주의할 점: 여러 서버 인스턴스가 동시에 scheduler를 수행하면 중복 실행될 수 있다. 현재 변경이 idempotent에 가깝지만 대규모 운영에서는 분산 lock 또는 한 전용 worker를 고려한다.

## University와 PickupLocation

`University`는 대학 기준 데이터다. `PickupLocation`은 한 대학에 속하며 `(university_id, name)`이 unique다.

- `UniversityController`: 누구나 대학과 해당 수령 장소 조회
- `UniversityAdminController`: ADMIN만 대학/장소 등록
- `UniversityRepository`: 이름 중복 확인
- `PickupLocationRepository`: 대학별 이름순 조회, 중복 확인

물품이 장소 문자열을 직접 저장하지 않고 `pickup_location_id`를 참조하는 이유는 오타와 중복을 막고 대학별 필터를 신뢰할 수 있게 하기 위해서다. 이것이 정규화다.

## 파일별 책임

| 파일 | 역할 |
|---|---|
| `User.java` | 사용자 Entity와 프로필/제재 상태 변경 |
| `UserController.java` | `/api/v1/users/me` 조회·수정 |
| `UserService.java` | 사용자 조회·프로필 업무 규칙 |
| `PublicUserController.java` | 공개 프로필/물품/후기 endpoint |
| `PublicUserProfileResponse.java` | 안전한 공개 응답 |
| `UserRepository.java` | 이메일/OAuth/제재 대상 DB 조회 |
| `ExpiredSanctionScheduler.java` | 만료 제재 주기 해제 |
| `UserResponse`, `UserProfileUpdateRequest` | API 출력/입력 계약 |
| `UserRole`, `UserStatus` | 허용 role/status |
| `University.java` | 대학 Entity |
| `UniversityController.java` | 기준 데이터 공개 조회 |
| `UniversityAdminController.java` | ADMIN 기준 데이터 생성 |
| `UniversityRepository.java` | 대학 조회/중복 검사 |
| `PickupLocation*` | 실제 Entity/Repository는 item 패키지에 위치 |

## 면접 연결

**Q. 공개 API에서 Entity를 그대로 반환하지 않는 이유는?**

민감 필드 노출, 양방향 관계 무한 직렬화, LAZY 조회, 스키마와 API의 강한 결합을 피하기 위해 DTO를 쓴다.

**Q. 외래키와 unique constraint를 Service 검증과 함께 쓰는 이유는?**

Service는 친절한 오류와 빠른 실패를 주지만 동시 요청 사이 race가 있다. DB constraint가 마지막 무결성 방어선이다.
