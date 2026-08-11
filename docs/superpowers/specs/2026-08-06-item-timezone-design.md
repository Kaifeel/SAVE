# 게시물 작성 시각 UTC 저장 설계

## 목표

백엔드가 어느 시간대의 서버 또는 컨테이너에서 실행되더라도 게시물 작성 시각을 동일한 절대 시각으로 저장·전달해 홈과 상세 화면의 `몇 분 전` 표시가 정확하게 유지되도록 한다.

## 시간대 계약

게시물의 생성·수정 시각은 Java `Instant`로 다룬다. `Instant.now()`는 JVM과 운영체제의 기본 시간대에 의존하지 않고 UTC 절대 시각을 생성한다.

API 응답은 `2026-08-06T03:00:00Z`처럼 UTC를 나타내는 `Z`가 포함된 ISO 8601 문자열을 반환한다. 브라우저는 이 값을 현재 절대 시각과 비교하므로 한국과 UTC 서버 어디서 실행해도 같은 `5분 전` 결과를 계산한다.

화면에 날짜와 시각을 직접 표시하는 기능을 나중에 추가할 경우에만 브라우저에서 사용자의 현지 시간대로 변환한다. 상대 시간 계산에는 별도의 한국 시간 변환이 필요하지 않다.

## Java 변경

`Item.createdAt`과 `Item.updatedAt`의 타입을 `LocalDateTime`에서 `Instant`로 변경하고 생성·수정 콜백에서 `Instant.now()`를 사용한다. `ItemResponse`도 두 필드를 `Instant`로 반환한다.

해당 Java 필드 또는 콜백에는 다음 이유를 설명하는 주석을 추가한다.

- 감사 시각을 UTC 절대 시각으로 저장한다.
- 서버 기본 시간대가 UTC 또는 한국 시간이어도 같은 순간을 기록한다.
- 현지 시간 변환은 API 소비 화면의 표시 단계에서 수행한다.

JVM의 전역 기본 시간대는 강제로 변경하지 않는다.

## 데이터베이스 마이그레이션

새 Flyway 마이그레이션 `V4__convert_item_timestamps_to_timestamptz.sql`을 추가한다. PostgreSQL의 `items.created_at`과 `items.updated_at`을 시간대 없는 `TIMESTAMP`에서 절대 시각을 저장하는 `TIMESTAMPTZ`로 변경한다.

기존 값은 한국 현지 시각으로 저장됐다는 현재 개발 데이터 계약에 따라 `Asia/Seoul`로 해석한다.

```sql
ALTER TABLE items
    ALTER COLUMN created_at TYPE TIMESTAMPTZ
    USING created_at AT TIME ZONE 'Asia/Seoul';

ALTER TABLE items
    ALTER COLUMN updated_at TYPE TIMESTAMPTZ
    USING updated_at AT TIME ZONE 'Asia/Seoul';
```

예를 들어 기존 `2026-08-06 12:00:00`은 한국 시각 정오로 해석되어 같은 순간인 `2026-08-06 03:00:00Z`로 변환된다. 게시물을 삭제하거나 다시 생성하지 않는다.

운영 데이터가 생긴 뒤 실행하는 경우에는 마이그레이션 전 DB 백업과 시간 표본 검증이 필요하다. 현재 개발 단계에서는 마이그레이션 자체와 변환 규칙을 자동 테스트한다.

## 개발 DB 호환성

개발과 테스트의 H2 스키마는 JPA의 `ddl-auto: update`가 `Instant` 필드에 맞는 시간대 지원 열을 생성하도록 한다. 운영 PostgreSQL에서는 Flyway V4가 스키마를 변경한다.

PostgreSQL 전용 `AT TIME ZONE` 문장은 H2 초기화에 실행하지 않는다. H2 테스트는 엔티티 저장·조회와 JSON 응답을 통해 `Instant` 왕복을 검증한다.

## 프런트엔드

프런트의 물품 정규화는 `created_at` 문자열을 그대로 `createdAt`에 보존한다. 기존 `Date` 파서, 상대 시간 포매터와 1분 갱신 훅은 `Z`가 포함된 UTC 문자열을 이미 처리하므로 로직을 변경하지 않는다.

## 오류 및 경계 처리

정상 저장된 게시물의 생성·수정 시각은 항상 존재한다. 기존 API 방어 규칙대로 누락되거나 잘못된 작성 시각은 상대 시간 문구를 표시하지 않는다.

마이그레이션은 `items` 테이블의 생성·수정 시각에만 적용한다. 대여 예약 시작·종료 시각과 다른 도메인의 감사 시각 전환은 별도 범위다.

## 테스트

- JVM 기본 시간대를 UTC와 `Asia/Seoul`로 각각 바꿔도 `Item`이 같은 방식의 `Instant`를 생성하는지 검증한다.
- H2에서 게시물 `Instant`가 저장·조회되는지 검증한다.
- 게시물 API 응답의 `created_at`과 `updated_at`이 `Z`가 포함된 ISO 8601 문자열인지 검증한다.
- Flyway V4 SQL이 기존 한국 현지 시각을 PostgreSQL `TIMESTAMPTZ`로 변환하는지 운영용 통합 환경에서 검증 가능하도록 명시한다.
- 프런트 상대 시간 테스트는 실제 백엔드 계약과 같은 `Z` 입력을 추가해 `5분 전`을 검증한다.
- 백엔드 전체 테스트, 프런트 전체 테스트, ESLint, 프로덕션 빌드를 실행한다.

## 범위 제외

- `items` 이외 모든 테이블의 시간을 한꺼번에 전환하는 작업
- 대여 예약 시작·종료 시각의 API 계약 변경
- JVM 또는 Docker의 전역 시간대를 한국으로 강제하는 설정
