# Expo Item Composition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Expo 글쓰기 shell with a tested native form that creates real backend items, optionally with up to five gallery photos.

**Architecture:** Keep transport serialization in `catalog/api.ts`, reference-data validation in `universities/api.ts`, pure draft rules in `catalog/item-composer.ts`, and asynchronous form orchestration in `catalog/use-item-composer.ts`. The route remains a presentation boundary that delegates permission/picker work to Expo ImagePicker and delegates all server state to the hook.

**Tech Stack:** Expo SDK 57, Expo Router, React Native 0.86, TypeScript 6, Zustand auth state, `expo-image-picker`, Jest Expo, React Native Testing Library, Spring Boot `/api/v1/items` contract.

**Spec:** `docs/superpowers/specs/2026-08-23-expo-item-composition-design.md`

## Global Constraints

- Preserve the established tab layout and shared theme; do not redesign unrelated screens.
- Use only server pickup locations and authenticated user identity; never add fallback products, locations, universities, sessions, or prices.
- Support `LEND` and `BORROW`, non-negative integer fees, a server pickup location, optional description and precautions, and at most five gallery images.
- Submit JSON without photos and multipart with photos; never set the multipart `Content-Type` header manually.
- Runtime-validate every successful item and pickup-location response.
- Preserve the draft after permission, validation, network, server, and malformed-response errors.
- Disable submission while pending so repeated taps issue at most one request.
- Use the Expo SDK 57-compatible ImagePicker installed through `npx expo install expo-image-picker`.
- Camera capture, durable draft storage, editing, and physical-device `verified` status remain out of scope.
- Follow strict red-green-refactor and commit each independently reviewable task.

---

## File Map

- `apps/save-app/src/catalog/types.ts`: public compose input and native photo asset types.
- `apps/save-app/src/catalog/api.ts`: JSON/multipart request construction and successful item parsing.
- `apps/save-app/src/catalog/api.test.ts`: exact transport contract and malformed-success tests.
- `backend/src/test/java/com/save/MarketplaceIntegrationTest.java`: multipart
  field-name characterization against the real Spring binding boundary.
- `apps/save-app/src/universities/api.ts`: validated pickup-location catalog request.
- `apps/save-app/src/universities/api.test.ts`: public university and pickup catalog boundary tests.
- `apps/save-app/src/catalog/item-composer.ts`: draft defaults and pure validation.
- `apps/save-app/src/catalog/item-composer.test.ts`: literal validation cases.
- `apps/save-app/src/catalog/use-item-composer.ts`: location loading, retry, draft updates, photo limit, and single-flight submission.
- `apps/save-app/src/catalog/use-item-composer.test.tsx`: hook state-transition and concurrency tests.
- `apps/save-app/src/app/(authenticated)/(tabs)/create.tsx`: accessible native compose presentation and ImagePicker interaction.
- `apps/save-app/src/__tests__/create-screen.test.tsx`: user-visible compose flow regression tests.
- `apps/save-app/app.json`: Korean photo-library permission explanation through the ImagePicker config plugin.
- `apps/save-app/package.json`, `apps/save-app/package-lock.json`: SDK-compatible ImagePicker dependency.
- `docs/mobile-ui-parity.md`: Compose status and fresh verification evidence.

---

### Task 1: Item creation transport contract

**Files:**
- Modify: `backend/src/test/java/com/save/MarketplaceIntegrationTest.java`
- Modify: `apps/save-app/src/catalog/types.ts`
- Modify: `apps/save-app/src/catalog/api.ts`
- Modify: `apps/save-app/src/catalog/api.test.ts`

**Interfaces:**
- Consumes: existing `apiRequest<T>(path, options)` and `parseCatalogItem(value)`.
- Produces: `ItemPhotoAsset`, `CreateItemInput`, and `createItem(input): Promise<CatalogItem>`.

- [ ] **Step 1: Characterize the real Spring multipart field names**

Add the static `multipart` request-builder import and this integration test.
It prevents the native client from guessing whether `@ModelAttribute` uses
Jackson's snake-case JSON naming or Java bean property names:

```java
@Test
void multipartItemCreationUsesJavaBeanFieldNames() throws Exception {
    String ownerToken = signUp("multipart@pukyong.ac.kr", "사진등록자")
            .get("access_token").asText();

    mockMvc.perform(multipart("/api/v1/items")
                    .header("Authorization", bearer(ownerToken))
                    .param("title", "멀티파트 우산")
                    .param("rentalFee", "1000")
                    .param("rentalUnit", "DAY")
                    .param("pickupLocationId", pickupLocationId.toString())
                    .param("type", "LEND")
                    .param("description", "깨끗합니다.")
                    .param("precautions", "분실 주의"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.title").value("멀티파트 우산"))
            .andExpect(jsonPath("$.rental_fee").value(1000))
            .andExpect(jsonPath("$.pickup_location_id").value(pickupLocationId));
}
```

Run: `./gradlew test --tests com.save.MarketplaceIntegrationTest.multipartItemCreationUsesJavaBeanFieldNames`

Expected: PASS, proving multipart uses `rentalFee`, `rentalUnit`, and
`pickupLocationId`. If it fails, stop and use the observed server binding names
in both this test and the mobile serializer before proceeding.

- [ ] **Step 2: Write failing JSON and multipart API tests**

Add imports for `createItem` and tests using the existing complete `backendItem`
fixture. The production change caught is sending camelCase or a manually fixed
multipart header instead of the backend contract.

```ts
it('creates a photo-free item with the exact JSON contract', async () => {
  apiRequestMock.mockResolvedValue(backendItem);

  await expect(createItem({
    type: 'LEND',
    title: 'USB-C 충전기',
    rentalFee: 0,
    rentalUnit: '일',
    pickupLocationId: 4,
    description: '정상 작동합니다.',
    precautions: '케이블을 함께 반납해 주세요.',
    photos: [],
  })).resolves.toEqual(expect.objectContaining({ id: 7 }));

  expect(apiRequestMock).toHaveBeenCalledWith('/items', {
    method: 'POST',
    body: JSON.stringify({
      type: 'LEND',
      title: 'USB-C 충전기',
      rental_fee: 0,
      rental_unit: '일',
      pickup_location_id: 4,
      description: '정상 작동합니다.',
      precautions: '케이블을 함께 반납해 주세요.',
    }),
  });
});

it('creates an item with native photo parts and no manual multipart header', async () => {
  apiRequestMock.mockResolvedValue(backendItem);
  await createItem({
    type: 'BORROW', title: '우산', rentalFee: 1000, rentalUnit: '일',
    pickupLocationId: 4, description: '', precautions: '',
    photos: [{ uri: 'file:///photo.jpg', fileName: 'photo.jpg', mimeType: 'image/jpeg' }],
  });

  const options = apiRequestMock.mock.calls[0][1];
  expect(options).toEqual({ method: 'POST', body: expect.any(FormData) });
  expect(options).not.toHaveProperty('headers.Content-Type');
  expect((options?.body as FormData).get('type')).toBe('BORROW');
  expect((options?.body as FormData).get('rentalFee')).toBe('1000');
  expect((options?.body as FormData).get('pickupLocationId')).toBe('4');
  expect((options?.body as FormData).getAll('photos')).toHaveLength(1);
});

it('rejects a malformed create response instead of navigating with it', async () => {
  apiRequestMock.mockResolvedValue({ ...backendItem, id: 'bad' });
  await expect(createItem(validCreateInput)).rejects.toThrow('catalog');
});
```

Define `validCreateInput` as a literal fixture in the test file; do not derive
it with the production serializer.

- [ ] **Step 3: Run the focused test and verify RED**

Run: `npm --prefix apps/save-app test -- --runTestsByPath src/catalog/api.test.ts`

Expected: FAIL because `createItem` and the compose types do not exist.

- [ ] **Step 4: Add compose types and minimal serializer**

```ts
export type ItemPhotoAsset = {
  uri: string;
  fileName: string;
  mimeType: string;
};

export type CreateItemInput = {
  type: CatalogItemType;
  title: string;
  rentalFee: number;
  rentalUnit: string;
  pickupLocationId: number;
  description: string;
  precautions: string;
  photos: ItemPhotoAsset[];
};
```

In `catalog/api.ts`, serialize JSON with snake-case keys. For multipart use the
Java bean property names expected by `@ModelAttribute` (`rentalFee`,
`rentalUnit`, `pickupLocationId`) and append each native asset as:

```ts
formData.append('photos', {
  uri: photo.uri,
  name: photo.fileName,
  type: photo.mimeType,
} as unknown as Blob);
```

Return `parseCatalogItem(await apiRequest<unknown>('/items', options))`.

- [ ] **Step 5: Run focused API tests and verify GREEN**

Run: `npm --prefix apps/save-app test -- --runTestsByPath src/catalog/api.test.ts`

Expected: PASS, including JSON, multipart, and malformed-success cases.

- [ ] **Step 6: Commit the transport boundary**

```bash
git add backend/src/test/java/com/save/MarketplaceIntegrationTest.java apps/save-app/src/catalog/types.ts apps/save-app/src/catalog/api.ts apps/save-app/src/catalog/api.test.ts
git commit -m "feat: add Expo item creation API"
```

---

### Task 2: Pickup-location reference data

**Files:**
- Modify: `apps/save-app/src/universities/api.ts`
- Modify: `apps/save-app/src/universities/api.test.ts`

**Interfaces:**
- Consumes: `runtime.apiBaseUrl` and existing public catalog error behavior.
- Produces: `PickupLocation { id: number; name: string }` and `getPickupLocations(universityId: number): Promise<PickupLocation[]>`.

- [ ] **Step 1: Write failing pickup catalog tests**

```ts
it('loads pickup locations for the exact authenticated university', async () => {
  fetchMock.mockResolvedValue(jsonResponse([
    { id: 4, name: '도서관 앞' },
    { id: 5, name: '학생회관' },
  ]));

  await expect(getPickupLocations(2)).resolves.toEqual([
    { id: 4, name: '도서관 앞' },
    { id: 5, name: '학생회관' },
  ]);
  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringMatching(/\/universities\/2\/pickup-locations$/),
    expect.objectContaining({ cache: 'no-store' }),
  );
});

it.each([
  [{ id: '4', name: '도서관 앞' }],
  [{ id: 4, name: '' }],
  { id: 4, name: '도서관 앞' },
])('rejects malformed pickup catalog data %#', async payload => {
  fetchMock.mockResolvedValue(jsonResponse(payload));
  await expect(getPickupLocations(2)).rejects.toThrow('pickup location catalog');
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm --prefix apps/save-app test -- --runTestsByPath src/universities/api.test.ts`

Expected: FAIL because the pickup API/type is absent.

- [ ] **Step 3: Implement the validated public request**

Add the type and a strict `isPickupLocation` guard. Reject non-positive or
non-integer `universityId` before fetching. Use the same response/error parsing
style as `getUniversities`, with the protocol message `Invalid pickup location
catalog response`.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm --prefix apps/save-app test -- --runTestsByPath src/universities/api.test.ts`

Expected: PASS with no fabricated fallback entries.

- [ ] **Step 5: Commit the reference-data boundary**

```bash
git add apps/save-app/src/universities/api.ts apps/save-app/src/universities/api.test.ts
git commit -m "feat: load Expo pickup locations"
```

---

### Task 3: Compose validation and asynchronous workflow

**Files:**
- Create: `apps/save-app/src/catalog/item-composer.ts`
- Create: `apps/save-app/src/catalog/item-composer.test.ts`
- Create: `apps/save-app/src/catalog/use-item-composer.ts`
- Create: `apps/save-app/src/catalog/use-item-composer.test.tsx`

**Interfaces:**
- Consumes: `createItem`, `getPickupLocations`, `CreateItemInput`, `ItemPhotoAsset`, and authenticated `universityId` supplied by the route.
- Produces: `ItemDraft`, `validateItemDraft(draft)`, and `useItemComposer(universityId)` with draft setters, catalog state, photo actions, retry, and `submit(): Promise<CatalogItem | null>`.

- [ ] **Step 1: Write failing pure validation tests**

Use a hand-written valid draft and table cases:

```ts
it.each([
  [{ title: '   ' }, '물품 이름을 입력해 주세요.'],
  [{ rentalFee: '-1' }, '대여 가격은 0 이상의 정수여야 합니다.'],
  [{ rentalFee: '1.5' }, '대여 가격은 0 이상의 정수여야 합니다.'],
  [{ pickupLocationId: null }, '거래 장소를 선택해 주세요.'],
  [{ photos: sixPhotos }, '사진은 최대 5장까지 등록할 수 있습니다.'],
])('rejects invalid compose draft %#', (patch, message) => {
  expect(validateItemDraft({ ...validDraft, ...patch })).toEqual({ ok: false, message });
});

it('trims text and converts a valid fee for submission', () => {
  expect(validateItemDraft({ ...validDraft, title: '  충전기  ', rentalFee: '0' }))
    .toEqual({ ok: true, input: expect.objectContaining({ title: '충전기', rentalFee: 0 }) });
});
```

- [ ] **Step 2: Run validation tests and verify RED**

Run: `npm --prefix apps/save-app test -- --runTestsByPath src/catalog/item-composer.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the pure draft model**

```ts
export type ItemDraft = {
  type: CatalogItemType;
  title: string;
  rentalFee: string;
  rentalUnit: '일' | '시간';
  pickupLocationId: number | null;
  description: string;
  precautions: string;
  photos: ItemPhotoAsset[];
};

export type ItemDraftValidation =
  | { ok: true; input: CreateItemInput }
  | { ok: false; message: string };
```

Export `initialItemDraft()` so each mount receives a fresh object and photo
array. Implement only the rules in the spec.

- [ ] **Step 4: Run validation tests and verify GREEN**

Run: `npm --prefix apps/save-app test -- --runTestsByPath src/catalog/item-composer.test.ts`

Expected: PASS.

- [ ] **Step 5: Write failing hook workflow tests**

Mock only the external API modules. Assert hook state, not mock rendering:

```ts
it('loads only the signed-in university pickup catalog and retries failures', async () => {
  getPickupLocationsMock
    .mockRejectedValueOnce(new Error('장소 서버 연결 실패'))
    .mockResolvedValueOnce([{ id: 4, name: '도서관 앞' }]);
  const { result } = renderHook(() => useItemComposer(2));
  await waitFor(() => expect(result.current.locationError).toBe('장소 서버 연결 실패'));
  act(() => { void result.current.retryLocations(); });
  await waitFor(() => expect(result.current.locations).toEqual([{ id: 4, name: '도서관 앞' }]));
  expect(getPickupLocationsMock).toHaveBeenNthCalledWith(1, 2);
  expect(getPickupLocationsMock).toHaveBeenNthCalledWith(2, 2);
});

it('keeps the draft and allows only one request while submission is pending', async () => {
  const pending = deferred<CatalogItem>();
  createItemMock.mockReturnValue(pending.promise);
  const { result } = renderHook(() => useItemComposer(2));
  act(() => {
    result.current.setField('title', '충전기');
    result.current.setField('rentalFee', '0');
    result.current.setField('pickupLocationId', 4);
  });
  act(() => {
    void result.current.submit();
    void result.current.submit();
  });
  expect(createItemMock).toHaveBeenCalledTimes(1);
  expect(result.current.submitting).toBe(true);
  pending.reject(new Error('등록 서버 실패'));
  await waitFor(() => expect(result.current.submitError).toBe('등록 서버 실패'));
  expect(result.current.draft.title).toBe('충전기');
});
```

Also cover missing university, empty locations, `addPhotos` truncating at five
with a visible limit message, removal by stable URI, successful return, and
fresh drafts across mounts.

- [ ] **Step 6: Run hook tests and verify RED**

Run: `npm --prefix apps/save-app test -- --runTestsByPath src/catalog/use-item-composer.test.tsx`

Expected: FAIL because `useItemComposer` is absent.

- [ ] **Step 7: Implement the minimal hook**

Expose this exact public shape:

```ts
type UseItemComposerResult = {
  draft: ItemDraft;
  locations: PickupLocation[];
  locationsLoading: boolean;
  locationError: string | null;
  submitError: string | null;
  photoNotice: string | null;
  submitting: boolean;
  setField: <K extends keyof ItemDraft>(key: K, value: ItemDraft[K]) => void;
  addPhotos: (photos: ItemPhotoAsset[]) => void;
  removePhoto: (uri: string) => void;
  retryLocations: () => Promise<void>;
  submit: () => Promise<CatalogItem | null>;
};
```

Use a synchronous `submittingRef` guard in addition to render state so two taps
in the same event turn cannot both issue requests. Ignore stale location loads
after university changes or unmount. Do not clear the draft after errors.

- [ ] **Step 8: Run model and hook tests and verify GREEN**

Run: `npm --prefix apps/save-app test -- --runTestsByPath src/catalog/item-composer.test.ts src/catalog/use-item-composer.test.tsx`

Expected: PASS.

- [ ] **Step 9: Commit the compose workflow**

```bash
git add apps/save-app/src/catalog/item-composer.ts apps/save-app/src/catalog/item-composer.test.ts apps/save-app/src/catalog/use-item-composer.ts apps/save-app/src/catalog/use-item-composer.test.tsx
git commit -m "feat: add Expo item composition workflow"
```

---

### Task 4: Native compose screen and gallery integration

**Files:**
- Modify: `apps/save-app/package.json`
- Modify: `apps/save-app/package-lock.json`
- Modify: `apps/save-app/app.json`
- Modify: `apps/save-app/src/app/(authenticated)/(tabs)/create.tsx`
- Create: `apps/save-app/src/__tests__/create-screen.test.tsx`

**Interfaces:**
- Consumes: `useAuthStore(state => state.user?.universityId)`, `useItemComposer(universityId)`, Expo Router `useRouter`, and Expo ImagePicker.
- Produces: a complete accessible compose route; successful submission calls `router.replace({ pathname: '/items/[id]', params: { id: String(item.id) } })`.

- [ ] **Step 1: Install the SDK-compatible gallery dependency**

Run from `apps/save-app`:

```bash
npx expo install expo-image-picker
```

Expected: `package.json` receives the SDK 57-compatible version and the lockfile
updates without unrelated upgrades.

Add the plugin configuration to `app.json` while preserving existing plugins:

```json
[
  "expo-image-picker",
  {
    "photosPermission": "물품 사진을 등록하기 위해 사진 보관함 접근이 필요합니다.",
    "cameraPermission": false,
    "microphonePermission": false
  }
]
```

- [ ] **Step 2: Write failing screen tests before replacing the shell**

Mock the API-backed hook dependencies and ImagePicker native boundary with
complete return shapes. The production break caught is the tab falling back to
the title shell or losing the draft on recoverable errors.

```ts
it('loads server pickup locations and submits the complete draft once', async () => {
  await render(<CreateScreen />);
  expect(await screen.findByText('도서관 앞')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '빌려줄래요' }));
  await fireEvent.changeText(screen.getByLabelText('물품 이름'), 'USB-C 충전기');
  await fireEvent.changeText(screen.getByLabelText('대여 가격'), '0');
  await fireEvent.press(screen.getByRole('button', { name: '거래 장소 선택' }));
  await fireEvent.press(screen.getByRole('button', { name: '도서관 앞' }));
  await fireEvent.changeText(screen.getByLabelText('설명'), '정상 작동합니다.');
  await fireEvent.changeText(screen.getByLabelText('주의사항'), '케이블도 반납해 주세요.');
  await fireEvent.press(screen.getByRole('button', { name: '물품 등록' }));
  await fireEvent.press(screen.getByRole('button', { name: '물품 등록' }));

  await waitFor(() => expect(createItemMock).toHaveBeenCalledTimes(1));
  expect(createItemMock).toHaveBeenCalledWith(expect.objectContaining({
    title: 'USB-C 충전기', rentalFee: 0, pickupLocationId: 4,
  }));
});

it('keeps composing when gallery permission is denied', async () => {
  requestMediaLibraryPermissionsAsyncMock.mockResolvedValue({ granted: false });
  await render(<CreateScreen />);
  await fireEvent.press(screen.getByRole('button', { name: '사진 추가' }));
  expect(await screen.findByText('사진 없이도 물품을 등록할 수 있습니다.')).toBeTruthy();
  expect(screen.getByLabelText('물품 이름')).toBeTruthy();
});

it('navigates to the authoritative created item detail', async () => {
  createItemMock.mockResolvedValue(catalogItem);
  await fillValidFormAndSubmit();
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith({
    pathname: '/items/[id]', params: { id: '7' },
  }));
});
```

Also test location loading failure/retry, empty catalog, validation alert,
picker cancellation, selecting and removing a photo, five-photo notice,
submission failure with the title still present, and pending button state.

- [ ] **Step 3: Run the screen test and verify RED**

Run: `npm --prefix apps/save-app test -- --runTestsByPath src/__tests__/create-screen.test.tsx`

Expected: FAIL because the current route contains only the `글쓰기` title.

- [ ] **Step 4: Build the minimal accessible presentation**

Use `KeyboardAvoidingView`, `ScrollView`, shared `theme`, labeled `TextInput`s,
`Pressable` transaction/unit controls, a location `Modal`, photo thumbnails,
and one primary submit button. Request gallery permission only when `사진 추가`
is pressed, then call:

```ts
const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ['images'],
  allowsMultipleSelection: true,
  selectionLimit: Math.max(1, 5 - composer.draft.photos.length),
  quality: 0.8,
});
```

Map non-cancelled assets to `ItemPhotoAsset`, using a stable fallback filename
derived from the asset URI and `image/jpeg` only when the picker omits MIME
metadata. Call `composer.submit()`, and navigate only when it returns an item.

- [ ] **Step 5: Run the screen test and verify GREEN**

Run: `npm --prefix apps/save-app test -- --runTestsByPath src/__tests__/create-screen.test.tsx`

Expected: PASS with no unhandled React warnings.

- [ ] **Step 6: Run focused compose regression tests together**

Run:

```bash
npm --prefix apps/save-app test -- --runTestsByPath src/catalog/api.test.ts src/universities/api.test.ts src/catalog/item-composer.test.ts src/catalog/use-item-composer.test.tsx src/__tests__/create-screen.test.tsx
```

Expected: all focused suites PASS.

- [ ] **Step 7: Commit the native compose screen**

```bash
git add apps/save-app/package.json apps/save-app/package-lock.json apps/save-app/app.json apps/save-app/src/app/'(authenticated)'/'(tabs)'/create.tsx apps/save-app/src/__tests__/create-screen.test.tsx
git commit -m "feat: implement Expo item composition screen"
```

---

### Task 5: Documentation and integrated verification

**Files:**
- Modify: `docs/mobile-ui-parity.md`

**Interfaces:**
- Consumes: all committed compose behavior and repository quality commands.
- Produces: truthful `implemented` documentation plus a verified delivery HEAD.

- [ ] **Step 1: Update the Compose parity row**

Change only the Compose row and add a dated milestone section. Record:

- status `implemented`;
- JSON/multipart item creation and validated pickup catalog;
- no fabricated draft/catalog data;
- automated test/export results;
- physical Android/iPhone status remains `Not run`.

Do not use `verified` without a real device acceptance run.

- [ ] **Step 2: Run the full Expo test suite**

Run: `npm run app:test`

Expected: all suites and tests PASS with zero failures.

- [ ] **Step 3: Run TypeScript and Expo lint**

Run: `npm run app:typecheck`

Expected: exit 0.

Run: `npm run app:lint`

Expected: exit 0.

- [ ] **Step 4: Produce a fresh Android bundle**

Run from `apps/save-app`:

```bash
npx expo export --platform android --output-dir /tmp/save-expo-compose-20260823
```

Expected: Metro bundles the Android entry and exports metadata with exit 0.

- [ ] **Step 5: Run repository regression gates**

Run: `npm run test:run`

Expected: all web tests PASS.

Run: `npm run lint`

Expected: exit 0.

Run: `npm run build`

Expected: Vite production build exits 0.

Run from `backend`: `./gradlew test --rerun-tasks`

Expected: `BUILD SUCCESSFUL` with no failed backend tests.

- [ ] **Step 6: Audit fixed production values and source size**

Run:

```bash
rg -n "mock[-_ ]?token|fake[-_ ]?item|샘플 물품|테스트 물품" apps/save-app/src --glob '!**/*.test.*' --glob '!**/test-utils/**'
```

Expected: no production mock session or fabricated item matches.

Run: `wc -l apps/save-app/src/app/'(authenticated)'/'(tabs)'/create.tsx apps/save-app/src/catalog/use-item-composer.ts`

Expected: if either file exceeds 300 lines, split presentation sections or hook
responsibilities before completion; do not compress behavior merely to satisfy
the threshold.

- [ ] **Step 7: Commit documentation and any verification-only corrections**

```bash
git add docs/mobile-ui-parity.md
git commit -m "docs: record Expo compose verification"
```

- [ ] **Step 8: Verify the final committed state**

Run: `git diff --check`

Expected: no output.

Run: `git status --short --branch`

Expected: clean `integration/save-platform` worktree. If a physical-device
stack trace becomes available, reproduce and fix it with a new failing test
before creating the delivery ZIP.
