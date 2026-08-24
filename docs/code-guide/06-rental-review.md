# 06. 대여와 상호 후기

## 대여 상태 머신

```text
                    lender 시작
REQUESTED --------------------------> RENTING ---- lender 반납 ----> RETURNED
    |                                    |
    ├─ lender 거절 → REJECTED            └─ 물품: RENTED
    └─ borrower 취소 → CANCELED

물품 상태:
AVAILABLE → REQUEST_PENDING → RENTED → AVAILABLE
                     └ 거절/취소 ─────→ AVAILABLE
```

`RentalStatus`에는 과거/확장용 `APPROVED`, `PAID`도 존재하지만 현재 UI와 Service의 정상 오프라인 흐름은 `REQUESTED → RENTING → RETURNED`다.

## 생성 흐름과 동시성

`RentalService.create(borrowerId, request)`는 다음 순서다.

1. `ItemRepository.findByIdForUpdate()`로 물품 행에 pessimistic write lock
2. 삭제 여부, 본인 물품 여부 검사
3. 물품 `AVAILABLE` 및 활성 Rental 없음 확인
4. 종료일이 시작일 이후인지 검사
5. `expectedTotal()`로 서버가 금액 재계산하여 클라이언트 금액과 비교
6. borrower와 chat room 조회
7. 채팅방의 물품/borrower/lender 조합이 요청과 같은지 검사
8. Rental 저장, Item을 `REQUEST_PENDING`으로 변경
9. lender에게 앱 안 알림 생성

두 사용자가 동시에 신청해도 물품 행 lock을 먼저 얻은 요청만 AVAILABLE을 본다. 다음 트랜잭션은 커밋 후 변경 상태를 보고 409를 받는다.

`expectedTotal()`은 기간 seconds를 HOUR/DAY/WEEK/MONTH seconds로 나누어 올림하고 최소 1단위를 적용한다. `Math.multiplyExact`는 overflow 시 조용히 잘못된 값을 만들지 않고 예외를 낸다.

## 상태 변경 메서드

- `reject`: lender만, REQUESTED/REQUEST_PENDING 확인 후 REJECTED/AVAILABLE
- `cancel`: borrower만, REQUESTED(또는 legacy APPROVED)에서 CANCELED/AVAILABLE
- `startRenting`: lender만, REQUESTED/REQUEST_PENDING에서 RENTING/RENTED
- `returnItem`: lender만, RENTING/RENTED에서 RETURNED/AVAILABLE, 정확한 `Clock.instant()` 기록
- `findRentalForUpdate`: 충돌 상태 전환을 직렬화
- `requireLender`, `requireStatus`, `requireItemStatus`: 권한과 두 상태 머신의 일치 검사

HTTP 403은 사용자가 누구인지 알지만 권한이 없는 경우, 404는 자원이 없음, 409는 현재 상태와 요청이 충돌함을 뜻한다.

## Rental Entity와 응답

Entity는 item, borrower, lender, chatRoom 외래키와 기간/금액/상태/timestamp를 가진다. `returnItem(Instant)`은 returnedAt을 두 번 설정하지 못하게 하며 상태도 함께 RETURNED로 바꾼다. 시간을 직접 `Instant.now()`로 만들지 않고 주입된 `Clock`을 써 테스트가 특정 시각을 재현할 수 있다.

`RentalResponse.from(rental, workflow)`은 현재 사용자의 후기 deadline/state까지 포함한다. 같은 Rental도 조회 사용자에 따라 후기 상태가 다를 수 있어 workflow를 Service가 계산해 전달한다.

대여 내역 카드가 추가 조회 없이 실제 정보를 표시하도록 응답에는 기존 연관
객체에서 읽은 `item_title`, `borrower_name`, `lender_name`도 포함한다. 이 값들은
`items.title`과 `users.name`을 응답 DTO에 투영한 것이며 Rental 테이블에 중복
저장하지 않으므로 ERD나 마이그레이션은 변경되지 않는다.

## 상호 후기 정책

반납 후 7일 안에 borrower와 lender가 서로에게 하나씩 작성한다.

- 첫 번째 후기만 제출: DB에는 저장하지만 상대에게 숨김
- 두 번째 후기 제출: 양쪽 후기 즉시 공개
- 7일 마감 도달: 제출된 후기 공개, 새 작성 불가
- 외부인, 미반납 거래, 중복 작성, 자기 자신 대상은 거부
- rating은 1~5, content는 trim 후 1~500자

이 정책은 먼저 쓴 사람이 상대 후기를 보고 보복 점수를 주는 편향을 줄인다.

## 후기 클래스

| 클래스 | 핵심 책임 |
|---|---|
| `ReviewController` | 제출, 공개 후기 조회 endpoint |
| `ReviewService` | `submit`, `workflow`, 참여자/마감/중복 검증, 공개 이벤트 발생 |
| `ReviewQueryService` | 공개 후기·평점 summary 조회 |
| `ReviewPolicy` | 7일 deadline과 공개 가능 조건 계산 |
| `ReviewRepository` | rental/reviewer/reviewee 기반 조회와 집계 |
| `Review` | rental, reviewer, reviewee, rating, content, createdAt Entity |
| `ReviewWorkflow` | deadline과 현재 사용자 `ReviewState` 묶음 |
| `ReviewState` | 작성 가능/대기/게시/기한 종료 등 UI 상태 |
| `ReviewSubmissionResponse` | 저장된 내 후기와 공개 여부/상대 제출 여부 |
| `PublicReviewResponse` | 공개 가능한 후기와 거래 역할만 표현 |
| `ReviewSummary` | 평균 평점과 후기 수 |

후기가 새로 공개되면 `InAppNotificationService.reviewPublished()`가 양쪽 알림을 저장한다. 프론트는 `REVIEW_PUBLISHED` 실시간 알림을 받아 rental/profile refresh key를 올린다.

## 면접 연결

**Q. 왜 pessimistic lock인가요?**

대여 신청/시작/거절은 충돌 가능성이 있고 한 번의 잘못된 성공이 실제 물품 이중 대여로 이어진다. 행 lock으로 같은 자원 전환을 직렬화해 규칙을 단순하고 강하게 보장했다. 경합이 매우 높으면 처리량과 deadlock을 고려해야 한다.

**Q. Transaction의 ACID를 코드에 연결하면?**

Rental 저장과 Item 상태 변경은 모두 성공하거나 롤백되는 Atomicity가 필요하다. 상태 제약과 lock으로 Consistency/Isolation을 지키고 커밋된 행은 DB가 Durability를 제공한다.

**Q. 상태 머신의 장점은?**

가능한 상태와 전이를 명시해 임의 boolean 조합보다 잘못된 전이를 찾기 쉽다. 코드와 테스트가 “어떤 상태에서 누가 무엇을 할 수 있는가”를 직접 표현한다.
