# Mutual Rental Reviews Design

## Goal

Allow the lender and borrower to review each other after a rental is returned. Each review contains a one-to-five star rating and required text. Reviews remain hidden until both participants submit, or until the seven-day submission window closes.

## Scope

This change includes review submission from the rental history, blind publication, public profile review lists and aggregates, and owner review aggregates on item detail pages. It does not include comments on item posts, review editing or deletion, reminders, push notifications, moderation, or administrator-configurable policy values.

## Policy

- Only the lender and borrower belonging to a `RETURNED` rental may submit a review.
- Each participant may review the other participant exactly once per rental.
- The server derives the review recipient from the authenticated participant; clients cannot select an arbitrary recipient.
- A rating is an integer from 1 through 5.
- Review text is required after trimming and is limited to 500 characters.
- A review cannot be edited, deleted, or submitted again.
- The submission deadline is exactly seven days after the recorded return time. Submission is no longer accepted at or after the deadline.
- If both participants submit before the deadline, both reviews become public immediately.
- If only one participant submits, that review becomes public when the deadline is reached.
- If neither participant submits, nothing is published.
- Only public reviews contribute to profile review counts and average ratings.

## Maintainable Seven-Day Setting

The backend owns the policy in one Java class. All deadline validation, publication checks, response fields, and tests use the same constant rather than embedding the number `7` throughout the code.

```java
public final class ReviewPolicy {

    // 후기 작성 기한을 변경하려면 이 값을 수정하세요.
    public static final int SUBMISSION_DEADLINE_DAYS = 7;

    private ReviewPolicy() {
    }
}
```

An administrator setting is intentionally deferred. The current constant is simple, discoverable, and sufficient until changing the policy without deploying becomes a real requirement.

## Data Model

### Rental

Add nullable `returned_at TIMESTAMPTZ` mapped to `Instant`. `Rental.returnItem` sets it once, at the same time the status changes to `RETURNED`. This timestamp is the immutable basis for the submission deadline; `updated_at` is not suitable because unrelated later updates could move the deadline.

Existing returned rentals are backfilled from their current `updated_at`, interpreting that legacy `LocalDateTime` as `Asia/Seoul`. Non-returned rentals keep `returned_at` null.

### Review

Create a `reviews` table and entity with:

- `id`
- `rental_id`
- `reviewer_id`
- `reviewee_id`
- `rating`
- `content`
- `created_at` as `TIMESTAMPTZ`/`Instant`

A unique constraint on `(rental_id, reviewer_id)` prevents duplicate reviews even under concurrent requests. Foreign keys connect the review to the rental and both users. A database check constraint restricts ratings to 1 through 5. Review content and timestamps are immutable after insertion.

No `visible` flag or scheduled publication job is stored. Publication is derived from the rental return time and the presence of the counterpart review, so server restarts cannot miss a publication event.

## Backend Components

Create a focused `review` package containing the review entity, repository, service, controller, policy, request DTOs, and response DTOs.

`ReviewService.submit` locks the rental row, validates the authenticated participant, `RETURNED` status, return timestamp, deadline, rating, text, and absence of an existing review. It derives the other participant as the recipient and inserts the review transactionally. The database unique constraint remains the final concurrency safeguard.

`ReviewService` uses an injected `Clock` for all current-time decisions. Tests can therefore cover the deadline boundary without changing the machine clock or timezone.

Publication is true when either:

1. both lender and borrower reviews exist for the rental; or
2. the current instant is at or after `returnedAt + ReviewPolicy.SUBMISSION_DEADLINE_DAYS`.

Private review content is never returned before publication. Participant-facing rental responses expose only review workflow metadata needed by the UI.

## API Design

### Submit a review

`POST /api/v1/rentals/{rentalId}/reviews`

Request:

```json
{
  "rating": 5,
  "content": "약속 시간을 잘 지켜주셨어요."
}
```

The response contains the submitted review only if it is public after this submission. Otherwise it returns submission metadata without exposing either participant's hidden review content.

### Rental review state

Extend participant-only rental responses with:

- `returned_at`
- `review_deadline`
- `review_state`: `NOT_AVAILABLE`, `AVAILABLE`, `SUBMITTED_WAITING`, `PUBLISHED`, or `EXPIRED`

`AVAILABLE` means the current user can submit. `SUBMITTED_WAITING` means the current user has submitted but publication is still blind. `PUBLISHED` means the current user submitted a review and it is now public because both reviews exist or the deadline passed. `EXPIRED` means the current user did not submit before the deadline, including when only the other participant's review became public. These fields let the existing rental list render the correct action without a separate status request.

### Public reviews

`GET /api/v1/users/{userId}/reviews`

Return only reviews that satisfy the publication rule, newest first. Each entry contains the rating, text, creation time, item summary, reviewer public summary, and recipient role for that rental (`LENDER` or `BORROWER`).

The existing public profile response calculates `rating` and `reviewCount` from the same public-review predicate. When there are no public reviews, the rating remains `0.0` and the count is `0`.

Item responses expose the owner's public average rating and review count so the existing item detail rating area no longer uses placeholder values. Selecting that area opens the owner's public profile.

## Frontend Flow

On `RentalsPage`, a returned rental in `AVAILABLE` state shows a **후기 작성** button. It opens a compact form containing a one-to-five star selector, a required text area, the 500-character limit, validation messages, and a submit button.

After submission:

- `SUBMITTED_WAITING` shows **상대방 후기 작성 대기 중** without displaying either review.
- `PUBLISHED` shows **후기 공개됨**.
- `EXPIRED` shows **후기 작성 기간 종료**.

`UserProfilePage` displays the server-provided average and count plus a received-review list. Every card shows stars, text, relative creation time, item summary, reviewer summary, and whether the user was reviewed as the lender or borrower.

`ProductDetailPage` displays the owner's public average and review count. Selecting the rating area navigates to the existing public profile screen, where the full review list appears.

## Error Handling and Privacy

- Unauthenticated requests remain `401` through the existing security setup.
- A user who is not part of the rental receives `403`.
- Missing rentals or users receive `404`.
- Non-returned rentals, duplicate submissions, and expired deadlines receive `409` because the current workflow state rejects the action.
- Invalid ratings or blank/oversized text receive `400` validation responses.
- A unique-constraint race is translated to the same duplicate-submission `409` response.
- Hidden ratings and text are excluded from public queries, profile aggregates, and participant responses until the publication condition is met.

## Migration

Add one Flyway migration that:

1. adds `rentals.returned_at`;
2. backfills returned rentals using the legacy Seoul-local `updated_at` value;
3. creates `reviews`, indexes, foreign keys, the unique constraint, and rating check constraint.

The application writes all newly introduced event timestamps as UTC instants. Relative time and seven-day calculations therefore remain independent of the browser, server, or user's local timezone.

## Testing

Backend tests cover:

- return transition records `returnedAt` once;
- lender and borrower can each review only the other participant;
- non-participants and non-returned rentals are rejected;
- ratings and review text validation;
- duplicate and concurrent duplicate prevention;
- submission succeeds immediately before the deadline and fails at the deadline;
- the first review stays private before the deadline;
- both reviews become public immediately after the second submission;
- a single review becomes public at the deadline;
- hidden reviews do not affect profile aggregates;
- public profile aggregates and lists use the same visibility rule;
- all deadline tests use a fixed `Clock` and the shared Java policy constant.

Frontend tests cover:

- review button visibility by rental review state;
- rating and text validation;
- successful submission and waiting state;
- published and expired states;
- public profile average, count, role labels, and review cards;
- item detail owner rating navigation;
- API normalization for snake_case and camelCase responses.

Run the complete backend test suite and frontend tests, lint, and production build before declaring implementation complete.
