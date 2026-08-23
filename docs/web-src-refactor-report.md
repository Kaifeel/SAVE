# Web `src/` Responsibility Refactor Report

Date: 2026-08-23

## Outcome

The refactor preserved the rendered UI and existing API/STOMP contracts while
moving workflow state, protocol normalization, demo fixtures, and large view
regions out of mixed-responsibility files.

| File | Before | After |
| --- | ---: | ---: |
| `src/App.jsx` | 975 | 343 |
| `src/pages/AdminPage.jsx` | 457 | 132 |
| `src/pages/ChatPage.jsx` | 277 | 89 |
| `src/api/normalizers.js` | 247 | 4 (compatibility barrel) |
| `src/components/ItemRegistrationModal.jsx` | 227 | 99 |

Non-test web production source changed from 5,589 to 6,077 lines. The total is
larger because explicit hook/component boundaries, direct tests, and reliability
handling replaced implicit coupling; the oversized mixed-responsibility files
were not compressed by deleting behavior.

## Files Above 200 Lines

- `src/App.jsx` (343): the approved application composition boundary. It wires
  focused domain hooks to the frame, active screen, and overlays and remains
  inside the 250–350 target.
- `src/hooks/useChatRooms.js` (239): cohesive chat remote-state owner for room
  selection, pagination, optimistic delivery, retry, and STOMP subscriptions.
- `src/pages/HomePage.jsx` (215): cohesive home-screen presentation.
- `src/ProductDetailPage.jsx` (211): cohesive product-detail presentation and
  its user actions.
- `src/data/items.js` (202): intentional fixed mock-mode catalog data with no
  runtime workflow responsibility.

No newly extracted production module exceeds 300 lines.

## Reliability Changes Protected by Tests

- Browser refresh installs a restored session once rather than storing the
  same refresh response in both the shared client and `App`.
- Duplicate realtime notifications no longer trigger duplicate workflow
  reloads.
- A realtime notification arriving before the initial REST notification load
  is retained.
- Item-to-chat navigation creates and selects one room before changing tabs.
- Demo chat and notification factories return fresh mutable graphs per mount.

## Verification

- Web: `npm run test:run` passed 55 files and 176 tests; `npm run lint` and
  `npm run build` also passed.
- Expo: `npm run app:test` passed 28 suites and 197 tests; `npm run
  app:typecheck` and `npm run app:lint` also passed.
- Backend: `./gradlew test --rerun-tasks` completed successfully with 96 tests,
  zero failures, zero errors, and zero skipped tests.

The delivery ZIP is created only from the verified committed HEAD.
