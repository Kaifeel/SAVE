# Expo Item Composition Design

Date: 2026-08-23
Status: Approved in chat; awaiting written-spec review

## Context

The Expo `create` tab is currently a presentation-only shell that renders the
word `글쓰기`. It has no item form, reference-data loading, photo selection,
validation, or connection to the existing `POST /api/v1/items` backend
contract. The Android production bundle compiles successfully, so the known
code defect is the missing composition flow rather than an Expo Router build
failure. A physical-device error may still be separate and must be checked
again after this flow is implemented.

## Goal

Replace the shell with a complete native item-composition flow that follows the
existing web and Spring Boot contracts without changing the established tab
layout or visual language. A signed-in user must be able to compose an item,
optionally attach up to five gallery images, submit it once, and land on the
authoritative item detail returned by the server.

## Scope

The milestone includes:

- `LEND` and `BORROW` transaction types;
- title, non-negative rental fee, rental unit, pickup location, description,
  and precautions fields;
- loading pickup locations for the signed-in user's university;
- gallery permission, image selection, preview, removal, and a five-image
  limit;
- JSON submission when no images are attached and multipart submission when
  one or more images are attached;
- client validation, pending-state protection, explicit reference-data and
  submission errors, and retry;
- navigation to `/items/[id]` after parsing the successful server response;
- automated API, validation, and screen behavior tests;
- Android export and the existing Expo quality gates;
- updating the mobile parity matrix from `shell` to `implemented` when the
  automated gates pass.

Camera capture, draft persistence across app termination, item editing, and
physical-device promotion to `verified` are outside this milestone. Gallery
selection covers the requested photo attachment for the capstone flow with the
smallest native permission surface.

## Architecture

### Catalog API boundary

`catalog/api.ts` will expose `createItem`. A small input type will use native
names (`rentalFee`, `pickupLocationId`) while the request builder emits the
backend's snake-case JSON keys. When photos are present it will build React
Native `FormData` entries using each asset's `uri`, filename, and MIME type and
will not set `Content-Type` manually, allowing `fetch` to add the multipart
boundary. The successful response must pass through `parseCatalogItem`; a
malformed 2xx response is a protocol error rather than a fabricated item.

The API builder will be independently testable so tests can prove the exact
JSON and multipart contracts without asserting on screen implementation
details.

### Pickup-location boundary

The university catalog module will add a runtime-validated
`getPickupLocations(universityId)` request for
`/universities/{id}/pickup-locations`. The screen obtains the university ID from
the authenticated user. Missing university identity is shown as a blocking
form error; no fixed university, location, or fallback catalog is invented.

### Form state and validation

A dedicated composition hook owns form state, pickup loading, and submission so
the route remains a presentation boundary. Validation is a pure function with
these rules:

- transaction type is `LEND` or `BORROW`;
- title is non-blank;
- rental fee is a whole number greater than or equal to zero;
- rental unit is non-blank;
- a server-provided pickup location is selected;
- at most five supported image assets are attached.

Description and precautions may be empty. The precautions field remains
visible because it is meaningful fixed guidance supplied by the owner, not
test data. Failed submission preserves the draft. A pending submission disables
the submit action so repeated taps cannot create duplicate items.

### Screen composition

The existing centered placeholder becomes a scrollable screen using the shared
theme. It presents transaction-type controls, photo selector and previews,
text inputs, fee/unit controls, pickup-location selector, description,
precautions, and one primary submit action. Keyboard avoidance and safe-area
spacing must work on Android and iPhone. Loading, empty, failure, permission
denial, validation, and submission states are explicit and accessible.

No sample item, price, location, photo count, or session value is rendered as
production data. Placeholders may contain explanatory examples because they are
input guidance rather than application records.

### Navigation and refresh behavior

After `createItem` returns a validated item, the route uses `router.replace`
with `/items/[id]` and the returned ID. Detail loading remains authoritative and
uses the existing item-detail implementation. Returning to home or explore
therefore obtains server state through their normal reload paths rather than
mutating unrelated local caches from the compose screen.

## Error Handling

- Pickup loading failure shows the server/network message and a retry action.
- An empty pickup catalog blocks submission and explains that an administrator
  must register a location.
- Gallery denial explains that photo attachment is optional and leaves the
  form usable without photos.
- Picker cancellation is a no-op.
- Images beyond the fifth are not appended; the user receives a concise limit
  message.
- Validation points to the first invalid field without clearing other values.
- API failures use the normalized API error message and keep all draft data.
- A malformed success payload is treated as an error and does not navigate.

## Testing

Development follows red-green-refactor:

1. API tests fail until JSON, multipart, and response parsing match the backend
   contract.
2. University API tests fail until pickup locations are runtime-validated.
3. Pure validation tests fail for blank titles, invalid fees, missing
   locations, and excessive photos.
4. Screen tests fail until the form loads server locations, handles retry and
   permission denial, prevents duplicate submission, preserves a failed draft,
   submits the correct values, and navigates with the returned item ID.
5. Existing Expo tests, TypeScript, Expo lint, and an Android production export
   run after the focused tests.

Physical Android and iPhone Expo Go checks remain a documented acceptance gate:
open the tab, deny and allow gallery permission, submit without and with a
photo, confirm item detail, and repeat after restarting Metro with a cleared
cache. If the originally reported runtime error remains, its exact device stack
trace becomes a separate failing regression test or an explicitly documented
native-only blocker.

## Dependencies and Configuration

Use the Expo SDK 57-compatible `expo-image-picker` version installed through
`npx expo install expo-image-picker`. Its config plugin will provide a Korean
photo-library permission explanation. No secret, fixed device address, or
credential is added to source control.

## Completion Criteria

- The compose route is no longer a shell and can create real backend items.
- JSON and multipart requests match the backend contract.
- All successful responses are runtime-validated.
- Duplicate taps create at most one request.
- No fabricated catalog or item data appears on failure or empty state.
- Focused tests and all Expo gates pass.
- Android production export succeeds.
- The parity document records `implemented`, while physical-device status
  remains `Not run` until a real device test is reported.
