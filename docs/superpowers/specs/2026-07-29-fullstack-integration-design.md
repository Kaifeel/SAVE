# SAVE Full-stack Integration Design

## 1. Goal

Complete the existing SAVE marketplace through five vertical integration stages:

1. Align the frontend with the Spring Boot item, university, and pickup-location APIs.
2. Complete REST and STOMP chat integration.
3. Connect the rental lifecycle from request through return.
4. Connect wishlist, OpenAI recommendations, and My Page data.
5. Add production-ready configuration for PostgreSQL, Flyway, restricted CORS,
   secure uploads, required secrets, and S3-compatible object storage.

The application remains runnable locally with H2 and local file storage. Creating
cloud databases, buckets, payment-provider integrations, monitoring accounts,
backups, and legal policy documents is outside the implementation boundary.

## 2. Global Constraints

- Preserve the existing React 19, Vite, Tailwind, Spring Boot 3.3, and Java 17 stack.
- Treat the Spring Boot snake_case JSON contract as the canonical API contract.
- Do not edit `backend/docs/schema.dbml` or
  `backend/docs/database-tables.md`.
- Preserve all pre-existing uncommitted changes and new files.
- Do not silently fall back to mock data when a real API request fails.
- Keep the development-only `PAID` transition unavailable in production.
- Keep OpenAI and storage credentials on the server; never expose them to React.

## 3. Delivery Strategy

Implement vertical slices in this order:

1. Items and university reference data
2. Chat
3. Rentals
4. Wishlist, recommendations, and My Page
5. Production configuration and security

Each slice includes frontend API code, UI state, backend rules where required,
and automated tests. A slice must pass its focused tests before work moves to
the next slice.

## 4. Runtime Modes

The frontend has three explicit data modes:

- `mock`: use only local fixture data and make no backend requests.
- `development`: use the real backend; expose actionable API errors and retry
  controls.
- `production`: use the real backend; show safe user-facing errors and retry
  controls without exposing internal details.

`VITE_API_MODE` selects the mode. `VITE_API_BASE_URL` defaults to
`http://localhost:8080/api/v1` for local development. `.env.example` documents
the supported variables. Legacy `VITE_USE_API` behavior is removed after its
call sites are migrated.

The backend has separate development and production configuration:

- Development uses H2, `ddl-auto: update`, local uploads, and an explicitly
  development-only JWT fallback.
- Production uses PostgreSQL, Flyway validation/migration, S3-compatible object
  storage, required JWT and CORS environment variables, and no H2 console.

## 5. Canonical API Model

### 5.1 Reference data and profiles

The frontend loads universities using `GET /api/v1/universities`. After a
university is selected it loads pickup locations using
`GET /api/v1/universities/{universityId}/pickup-locations`.

Profiles store and submit `university_id`. UI components may display names, but
IDs are the source of truth for requests and filters.

### 5.2 Items

Item create and update requests use:

```json
{
  "title": "우산",
  "type": "LEND",
  "rental_fee": 1000,
  "rental_unit": "DAY",
  "pickup_location_id": 1,
  "description": "깨끗한 우산입니다.",
  "precautions": "사용 후 말려주세요."
}
```

Multipart requests use the same snake_case field names plus `photos`. The
frontend normalizer maps `rental_fee`, `rental_unit`,
`pickup_location_name`, `owner_university_id`,
`owner_university_name`, `main_image_url`, `image_urls`, `wishlist_count`,
and `wishlisted` into the view model.

Item listing, detail, create, update, status update, and delete all use the real
API outside mock mode. University filtering uses `university_id`.

## 6. Shared Frontend Infrastructure

The API client owns URL construction, JSON parsing, error normalization, and
authentication headers. It emits a single unauthorized event for a 401
response. The application clears authentication and returns to the login screen
when that event occurs.

HTTP 400, 403, 404, 409, and 5xx responses are represented by a common
`ApiError` with status, code, message, and response data. Network failures use a
distinct error code.

A toast provider replaces `alert()`. Screen-level error components replace
user-flow `console.error()` calls. List and detail views distinguish:

- Loading
- Loaded with data
- Loaded with no data
- Failed with retry available

API modules remain responsible for transport DTOs. Normalizers remain
responsible for converting transport DTOs to frontend view models.

## 7. Chat

When the user selects a chat room, the application:

1. Loads recent messages through
   `GET /api/v1/chats/rooms/{roomId}/messages`.
2. Marks messages read through
   `PATCH /api/v1/chats/rooms/{roomId}/read`.
3. Connects to `/ws-chat` with the bearer token in the STOMP `CONNECT` headers.
4. Subscribes to `/topic/chats/rooms/{roomId}`.

The client deduplicates messages by server message ID. Optimistically sent
messages have `sending`, `sent`, or `failed` state and failed messages can be
retried. Reconnection uses bounded exponential backoff and resubscribes only
after successful authentication.

Older messages are loaded with bounded page or cursor parameters supported by
the backend. Selecting another room cancels the previous subscription.

Outside mock mode, chat-room creation failure stops navigation and displays the
actual error. It never creates a fake room.

## 8. Rental Lifecycle

The user can create a rental request from an item or its chat room by providing
start date, end date, and total amount. The server validates:

- Start date is before end date.
- Total price is non-negative and matches server-side pricing rules.
- The borrower is not the item owner.
- The chat room belongs to the item and contains both parties.
- The item is available for a new request.

The UI separates sent and received requests and exposes only role-appropriate
actions:

```text
REQUESTED: lender approves/rejects; borrower cancels
APPROVED: development-only payment transition
PAID: lender starts the rental
RENTING: lender records the return
RETURNED, REJECTED, CANCELLED: terminal
```

The backend is the final authority for every transition. Production rejects
direct calls to the development payment endpoint. A future payment provider
must replace it with a verified webhook.

## 9. Wishlist, Recommendations, and My Page

The item-detail wishlist control calls the add or remove endpoint, updates the
count and selected state after success, and rolls back an optimistic update on
failure.

My Page loads the signed-in user's profile, items, wishlist, and rentals. The
independent requests may run concurrently, but each section owns its loading,
empty, and error state so one failure does not hide successful sections.

### 9.1 OpenAI recommendation boundary

FastAPI is not added. Spring Boot remains the only application backend and
calls the OpenAI API server-side.

The recommendation flow is:

1. Load the authenticated user's profile and wishlist from the database.
2. Load `AVAILABLE` items from the user's university.
3. Exclude the user's own items and any item that cannot be rented.
4. Build a bounded candidate list containing item ID, title, rental fee/unit,
   pickup location, and description.
5. Send the candidate list and current weather, time, and exam-period context
   to the OpenAI Responses API.
6. Require Structured Output with this logical schema:

```json
{
  "headline": "비 오는 날 우산이 없으신가요?",
  "recommendations": [
    {
      "item_id": 1,
      "reason": "현재 날씨와 사용자의 찜 기록에 적합합니다."
    }
  ]
}
```

7. Reject duplicate IDs and remove IDs that were not in the supplied candidate
   set.
8. Limit the result to three items.
9. Persist the request context, headline, ordered item references, and reasons.
10. Return the persisted recommendation with normalized item DTOs.

The OpenAI key and model are environment variables. API refusal, timeout,
invalid output, unavailable credentials, and upstream errors produce explicit
service errors. Production does not replace a failed OpenAI call with
hardcoded recommendations. A deterministic rule-based fallback may be enabled
only through an explicit configuration flag and is labeled as non-AI output.

The existing Python mock script is an evaluation reference, not a FastAPI
service. Its scenarios can become offline fixtures, but its mock users and
items are not used by the application.

## 10. Production Readiness

### 10.1 Database migrations

Add PostgreSQL runtime support and Flyway. Production sets
`ddl-auto: validate`. Migrations describe the schema expected by the current
JPA entities without modifying the protected ERD documents. H2 remains
available for local development and tests.

### 10.2 Secrets and CORS

Production startup fails when the JWT secret is absent, unchanged from the
development fallback, or too short. Allowed CORS origins come from a required
environment variable and credentials are allowed only for exact configured
origins.

OpenAI, Google OAuth, Firebase, database, and S3 secrets are supplied through
environment variables and are absent from committed example files.

### 10.3 Upload security and storage

The upload boundary validates:

- Configurable maximum file count and byte size
- Allowed MIME types
- Allowed extensions
- Image signatures and successful image decoding
- Generated server-side object names
- No path traversal or client-controlled filesystem path

A storage interface has local-filesystem and S3-compatible implementations.
Development selects local storage; production selects S3-compatible storage
using endpoint, region, bucket, access-key, and secret-key environment
variables. Stored URLs or object keys are returned through the existing item
response contract.

### 10.4 Token storage and observability

The frontend keeps the access token in memory by default. Persistent automatic
login is opt-in and its risk is documented. A full HttpOnly refresh-token
architecture is not introduced unless the backend adds refresh-token rotation.

Backend logs include request correlation IDs and safe failure context without
tokens, credentials, passwords, or private message content. Health endpoints
support deployment checks. Backup infrastructure and privacy-policy authoring
remain deployment-owner responsibilities and are documented as launch
requirements.

## 11. Testing

Frontend tests use Vitest, React Testing Library, and mocked network boundaries.
They cover:

- Snake_case item request contracts and response normalization
- University and pickup-location selection
- 401 logout behavior
- Loading, empty, failure, and retry UI
- Chat message loading, read calls, deduplication, reconnect, and failed sends
- Rental role/status controls and request validation
- Wishlist rollback
- Recommendation and My Page rendering without hardcoded data

Backend tests cover:

- Non-owner item update and delete denial
- Pickup location from another university
- Chat and rental attempts on one's own item
- Invalid rental transitions and production payment denial
- Message access by a nonparticipant
- Report target combinations
- Suspended-user API access
- Upload size, MIME, extension, signature, and path safety
- WebSocket JWT authentication and room authorization
- Recommendation candidate filtering, Structured Output validation, unknown
  item IDs, upstream failures, and persisted ordering/reasons
- Development and production configuration validation

OpenAI calls, S3 operations, and payment-provider behavior are tested through
interfaces with deterministic fakes. Automated tests do not make chargeable
OpenAI requests.

## 12. Completion Criteria

The implementation is complete when:

- Frontend tests, ESLint, and production build pass in a clean Linux dependency
  installation.
- Backend unit and integration tests pass on Java 17.
- Each real-API workflow reports failures rather than silently using mock data.
- Production configuration validates PostgreSQL, Flyway, S3-compatible
  storage, JWT, and CORS requirements without requiring actual cloud
  provisioning in tests.
- `git diff` confirms no changes to `backend/docs/schema.dbml` or
  `backend/docs/database-tables.md`.

