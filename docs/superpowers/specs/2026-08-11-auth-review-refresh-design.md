# OAuth Profile Persistence and Review Refresh Design

## Goal

Fix two user-visible state synchronization defects without changing the existing offline rental lifecycle:

1. A Google OAuth user who completes profile setup must remain on the authenticated application after a browser refresh.
2. Rental review state, published review text, rating averages, and review counts must update without requiring a full browser refresh.

## Non-goals

- Do not change `REQUESTED -> RENTING -> RETURNED` or its existing buttons.
- Do not introduce Zustand or replace the current React hook structure.
- Do not store passwords, Google credentials, or any new secret in browser storage.
- Do not change the mutual blind-review publication rule.

## Authentication State Design

The access token and the authentication user snapshot are already stored together under `save_auth` in `localStorage`. The defect occurs because profile setup updates the database but leaves the stored user snapshot with `department` and `university_id` set to `null`.

After `PUT /api/v1/users/me/profile` succeeds, the frontend will merge the returned `UserResponse` into `auth.user`, call `saveAuth` with the updated authentication object, and update the in-memory `auth` state. The existing access token is preserved unchanged. A subsequent application initialization therefore sees a complete user profile and renders the authenticated application instead of `ProfileSetupPage`.

This does not expand the browser's security exposure: only the same public profile fields already returned in authentication responses are updated. Passwords, Google ID tokens, OAuth login codes, and backend secrets remain unpersisted.

## Review Refresh Design

Review refresh has two paths because a blind mutual review may be changed by either browser.

### Local submission

After a successful review submission, `useRentals` will immediately apply the returned `review_state` and `review_deadline` to the matching rental, then perform the existing server reload in the background. The review modal closes after success, so the user sees `상대방 후기 작성 대기 중` or `후기 공개됨` without reloading the page.

The existing related-data callback will continue to reload My Page and item data so rating summaries are refreshed.

### Other participant submission

When the second review makes both reviews public, the backend will create a `REVIEW_PUBLISHED` in-app notification for both rental participants using the existing WebSocket notification channel. Receiving a rental/review workflow notification will invalidate and reload rental data, My Page data, item summaries, and any currently open public profile.

Opening the rental-history screen will also run a fresh rental query. This provides a fallback when the WebSocket was disconnected without requiring a full browser refresh.

## Error Handling

- A failed profile update must not mutate stored authentication data or leave profile setup.
- A failed review submission keeps the modal open and displays the existing error toast.
- A failed background refresh keeps the successful local review state while exposing the existing retry behavior.
- Notification-driven reload failures do not log the user out and can be retried by reopening rental history.

## Tests

- Frontend regression test: completing an OAuth profile replaces the stored user snapshot; unmounting and remounting no longer renders profile setup.
- Hook test: review submission applies the returned workflow state immediately and still reloads server data.
- Frontend notification test: `REVIEW_PUBLISHED` requests related-data refresh.
- Rental-page test: entering the page requests fresh rental data.
- Backend integration test: the second review publishes both reviews and creates `REVIEW_PUBLISHED` notifications for both participants.
- Run the complete frontend test suite, backend test suite, and frontend production build.
