# Web `src/` Responsibility Refactor Design

## Goal

Refactor oversized web production files into cohesive modules without changing
the rendered UI, public API request contracts, authentication behavior, chat
delivery semantics, mock-mode behavior, or user-visible copy.

The primary success criterion is that `src/App.jsx` stops owning domain logic
and becomes an application composition boundary of approximately 250–350
lines. Line counts are a diagnostic target, not a reason to split cohesive
data or utilities into arbitrary fragments.

## Current Problem

The web `src/` directory contains 5,589 lines of non-test JavaScript and JSX.
The largest mixed-responsibility files are:

| File | Current lines | Problem |
| --- | ---: | --- |
| `src/App.jsx` | 975 | Authentication, data loading, filtering, item editing, chat, notifications, rentals, reports, navigation, and all overlay composition are coupled. |
| `src/pages/AdminPage.jsx` | 457 | Report loading, normalization, filters, selection, moderation actions, and large desktop/mobile views share one component. |
| `src/pages/ChatPage.jsx` | 277 | Date formatting, linked-item lookup, room list, message timeline, pagination, and composer rendering are combined. |
| `src/api/normalizers.js` | 247 | Item, user, rental, review, and chat protocol adapters share one domain-agnostic file. |
| `src/components/ItemRegistrationModal.jsx` | 227 | Modal chrome and every form section are rendered together. |

Long cohesive files are not automatically defects. In particular,
`src/data/items.js` is fixed mock-mode reference data and may remain long while
it has one clear responsibility.

## Constraints

- Do not redesign or restyle the UI.
- Do not change API paths, methods, payload keys, response normalization, or
  STOMP destinations.
- Preserve API mode and intentional mock-mode demo values.
- Preserve existing imports from `src/api/normalizers.js` during migration.
- Do not introduce a routing library or replace Zustand.
- Do not combine this work with new product features.
- Every behavior change required to remove an actual defect starts with a
  failing regression test.

## Chosen Approach

Use staged responsibility extraction. Keep `App` as the owner of top-level
screen selection and shared domain wiring, but move each workflow behind a
focused hook or container interface. Extract visual regions only where they
form a meaningful component with a small prop contract.

This is preferred over two alternatives:

1. JSX-only extraction would reduce the line count while leaving state and
   side effects coupled in `App`.
2. A router/global-state rewrite would create unnecessary behavior and UI risk
   for a structural cleanup.

## Target Architecture

### Application composition

`src/App.jsx` will retain:

- top-level authentication/profile/admin gates;
- active tab and selected top-level target coordination;
- construction of existing domain hooks;
- composition of `AppFrame`, active page, and workflow overlays.

It will not retain large mock fixtures, authentication restoration effects,
notification fetching/read handling, item-form field state, or inline report,
wishlist, chat-room creation, and rental-request overlay implementations.

New focused modules:

- `src/hooks/useAppSession.js`: refresh/Google callback restoration, login,
  profile completion, unauthorized reset, and logout orchestration.
- `src/hooks/useAppNotifications.js`: initial notification fetch, realtime
  deduplication, workflow refresh fan-out, unread state, and mark-all-read.
- `src/hooks/useItemEditor.js`: item form state, photo selection/removal,
  create/edit initialization, submission, reset, and close behavior.
- `src/components/AppFrame.jsx`: unchanged mobile frame, status bar, header,
  notification panel, main slot, and bottom navigation composition.
- `src/components/AppOverlays.jsx`: product detail, profile, report, item editor,
  and rental-request overlay composition using explicit handler props.
- `src/data/demoChats.js` and `src/data/demoNotifications.js`: intentional
  mock-mode fixtures currently embedded in `App`.

Handlers that need several existing domains may remain in a small
`useMarketplaceActions` hook only if extraction avoids a broad bag-of-props
interface. Otherwise they stay as short callbacks in `App`.

### Admin page

Split by observable responsibility:

- `useAdminReports`: load, retry, filter state, selected report, and moderation
  mutation/refetch behavior;
- `AdminReportList`: responsive report list/table;
- `AdminReportDetail`: selected report detail and action controls;
- `AdminAccessDenied` remains a stable named export.

Normalization that adapts the admin endpoint belongs beside the API adapter,
not inside the page component.

### Chat page

Split the visual regions without moving server state out of `useChatRooms`:

- `ChatRoomList` renders rooms and unread state;
- `ChatMessageTimeline` renders date separators, pagination, delivery states,
  and retry controls;
- `ChatComposer` renders input and send controls;
- chat date/link formatting moves to `src/chat/presentation.js` with direct unit
  tests for date boundaries and linked-item selection.

`ChatPage` remains the screen-level layout and composes these regions.

### Protocol normalization

Create domain modules under `src/api/normalizers/`:

- `items.js`: item normalization and create-item payload;
- `users.js`: public user and review normalization;
- `rentals.js`: rental normalization;
- `chat.js`: chat room/message normalization and merge/reconciliation logic;
- `shared.js`: response wrapper helpers used by more than one domain.

The existing `src/api/normalizers.js` becomes a compatibility barrel that
re-exports the same named functions. Existing consumers therefore do not need
a big-bang import migration.

### Item registration modal

Keep form state in `useItemEditor`. Split the modal only into coherent visual
sections such as photo selection, item basics, and rental conditions if the
resulting props remain specific. Do not create components that merely wrap one
element or pass the entire editor object without an explicit contract.

## Data and State Flow

1. `App` obtains the persisted auth snapshot from Zustand.
2. `useAppSession` resolves restoration and exposes authenticated profile
   state plus stable session actions.
3. Existing domain hooks (`useItems`, `useChatRooms`, `useRentals`,
   `useMyPageData`, and `useRecommendations`) continue to own remote state.
4. `useAppNotifications` receives only the reload callbacks needed for rental,
   profile, and item refresh after workflow notifications.
5. `AppFrame` receives display-ready header/navigation values and renders an
   active-page slot; it owns no server state.
6. `AppOverlays` receives selected targets and focused action callbacks; it
   does not fetch independently unless the existing overlay already does so.

Dependencies must continue to point from composition to focused modules.
Extracted modules must not import `App` or mutate another hook's internal
state.

## Behavior Characterization

Authentication restoration and item-to-chat navigation are high-risk
orchestration boundaries even though the current source contains one call path
for each. Before moving either path, add or strengthen tests that prove:

- one restoration response installs the session exactly once;
- selecting chat from an item creates/selects at most one room and navigates
  once;
- failed restoration clears the session without duplicate user feedback.

These are characterization tests for refactoring safety, not evidence of a
known duplicate-execution defect. Refactoring must preserve existing error
messages and retry behavior. New
hooks return errors or call the existing toast boundary consistently; they do
not silently swallow failures that are currently visible.

## Size and Quality Gates

- `src/App.jsx`: target 250–350 lines; hard review threshold 400 lines.
- No newly extracted production file should exceed 300 lines without a
  documented cohesive reason.
- Files over 200 lines receive a responsibility review, but cohesive data,
  schemas, and presentation utilities are allowed to remain.
- No circular imports between `App`, hooks, components, and API modules.
- No new duplicated mock fixtures or inline protocol conversions.
- `git diff --check` and the existing lint/build gates must remain clean.

## Testing Strategy

Work proceeds in small extraction commits. For every stage:

1. Run the closest existing tests before editing.
2. Add a failing regression test for any actual defect, then make it pass.
3. Extract without changing assertions or user-visible behavior.
4. Run focused tests after each extraction.
5. Run the complete web suite, ESLint, and Vite production build at the end.
6. Run Expo and backend regression gates because the repository is delivered
   as one integrated archive.

Required final evidence:

- current and final production-file line-count report;
- 42 existing web test files plus new regression tests passing;
- web ESLint and Vite build passing;
- Expo tests/typecheck/lint passing;
- backend Gradle tests passing;
- a fresh dated ZIP created only after the refactor commits are verified.

## Delivery

The refactor stays on `integration/save-platform` as a sequence of reviewable
commits. The prior dated ZIP is superseded only after all automated gates pass.
The replacement ZIP uses the existing
`SAVE-private-beta-testYYYY-MM-DD-<description>.zip` naming convention and
contains committed source only, excluding Git metadata, dependencies, build
outputs, local environment files, and credentials.
