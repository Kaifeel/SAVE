# 09. 데이터베이스와 JPA

## 환경별 스키마 관리

- dev: H2를 PostgreSQL 호환 모드로 실행하고 Hibernate `ddl-auto=update`, `data-dev.sql`로 기준 데이터 입력
- prod: PostgreSQL, Hibernate는 `validate`만 수행, Flyway `V1`~`V6` SQL이 변경 적용

운영에서 `update` 대신 Flyway를 쓰면 변경 순서와 리뷰 이력을 SQL로 남기고 모든 서버가 같은 schema version을 사용하게 한다.

## 핵심 관계

```text
universities 1 ── N pickup_locations
universities 1 ── N users
users        1 ── N items
items        1 ── N item_images
users N ── N items       (wishlists)
items/users  ── chat_rooms ── N chat_messages
chat_rooms/items/users ── rentals
rentals/users ── reviews
rentals/users ── notifications
users/items/chat_rooms ── reports
users N ── N items       (recommendation_items)
users 1 ── N refresh_tokens
```

## Migration별 의미

| 버전 | 변경 |
|---|---|
| V1 | 대학부터 device token까지 baseline 테이블과 채팅 인덱스 |
| V2 | `(users.status, sanctioned_until)` 제재 만료 검색 인덱스 |
| V3 | 영속 notifications와 사용자/읽음 인덱스 |
| V4 | 물품 timestamp를 timezone 포함 `TIMESTAMPTZ`로 전환 |
| V5 | rental returnedAt, mutual reviews, rating/user check와 조회 인덱스 |
| V6 | 해시된 회전 refresh token과 family/user 인덱스 |

## 기본키·외래키·제약

- 기본키는 행을 유일하게 식별한다.
- 외래키는 없는 사용자/물품을 참조하지 못하게 한다.
- unique: 이메일, 채팅방 조합, 한 거래의 한 사용자 후기, 찜 중복 등을 막는다.
- check: rating 1~5, reviewer와 reviewee가 다름을 DB에서도 보장한다.
- `ON DELETE CASCADE` refresh token은 user 삭제 시 같이 제거된다. 다른 거래 기록은 의도적으로 cascade delete하지 않는다.

Service 검증은 친절한 오류를 만들고 DB constraint는 race condition에도 무결성을 보장한다. 둘은 대체 관계가 아니다.

## 인덱스

인덱스는 정렬된 별도 자료구조(B-tree가 일반적)로 검색을 빠르게 하지만 쓰기와 공간 비용을 추가한다.

- `chat_messages(room_id, created_at)`: 방의 시간순 메시지
- `chat_messages(room_id, is_read)`: 방 unread 갱신/조회
- `notifications(user_id, created_at)`: 내 최근 알림
- `notifications(user_id, is_read)`: unread count
- `reviews(reviewee_id, created_at DESC)`: 사용자 공개 후기
- `refresh_tokens(token_hash/family_id/user_id)`: 회전·폐기 조회

복합 인덱스는 일반적으로 왼쪽 열부터 조건에 사용해야 효과적이다. cardinality와 실제 query plan을 측정해 선택한다.

## 영속성 Context와 dirty checking

트랜잭션 안에서 Repository로 읽은 Entity는 managed 상태다. `item.changeStatus()` 후 별도 `save(item)`가 없어도 commit 때 Hibernate가 원본 snapshot과 비교해 UPDATE를 만든다. 이것이 dirty checking이다.

`save(new Entity)`는 INSERT를 예약한다. flush는 SQL을 DB에 보내는 시점이고 commit은 트랜잭션을 확정하는 시점이다. 두 시점은 같지 않을 수 있다.

## N+1과 LAZY

목록 Entity N개를 조회한 뒤 각각 owner를 읽어 추가 SELECT N개가 발생하면 N+1 문제다. 이 프로젝트는 필요한 Repository에서 `@EntityGraph`나 `join fetch`를 사용한다. 모든 관계를 EAGER로 바꾸면 원치 않는 거대한 join과 순환 로딩이 생기므로 필요한 query별 fetch가 낫다.

`spring.jpa.open-in-view=false`는 Controller JSON 변환 중 임의 쿼리가 나가는 것을 막는다. 필요한 데이터는 Service 트랜잭션 안에서 준비해야 한다.

## 시간 타입

- `Instant`: UTC timeline의 한 점. 물품 timestamp, returnedAt, review deadline에 적합
- `LocalDateTime`: zone 정보 없는 날짜/시각. 기존 다수 테이블에 사용
- PostgreSQL `TIMESTAMPTZ`: 입력 offset을 UTC 기준으로 저장·표시 zone에 맞춰 변환

새 기능은 서버·DB·JSON에서 시간 의미를 일관되게 정해야 한다. `Clock` 주입은 테스트 가능한 현재 시간을 제공한다.

## 면접 연결

**Q. 정규화란?**

중복과 갱신 이상을 줄이도록 데이터를 관계 테이블로 분리하는 것이다. 수령 장소 이름을 items에 반복하지 않고 `pickup_locations`와 외래키로 관리하는 것이 사례다.

**Q. Isolation level과 lost update는?**

동시에 같은 값을 읽고 각각 덮어쓰면 한 변경이 사라질 수 있다. 대여 전환은 `SELECT ... FOR UPDATE` 성격의 pessimistic lock으로 같은 행 변경을 직렬화한다.

**Q. 인덱스를 많이 만들면 항상 좋은가?**

아니다. INSERT/UPDATE/DELETE마다 인덱스도 갱신하며 저장 공간과 cache를 쓴다. 실제 where/order/join과 실행 계획에 근거해 만든다.
