# Item UTC Timestamps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store item audit timestamps as UTC instants and return timezone-qualified API values so relative ages remain correct on UTC or Korean servers.

**Architecture:** Replace only `Item.createdAt` and `Item.updatedAt` with Java `Instant`, allowing Jackson to return ISO 8601 `Z` timestamps. A PostgreSQL Flyway migration interprets existing naive values as Korean local time and converts the columns to `TIMESTAMPTZ`; the existing frontend formatter consumes the absolute timestamps unchanged.

**Tech Stack:** Java 17, Spring Boot, Spring Data JPA, Flyway, PostgreSQL, H2, React 19, Vitest

## Global Constraints

- Do not change the JVM or Docker global timezone.
- Convert only `items.created_at` and `items.updated_at`.
- Interpret existing naive item timestamps as `Asia/Seoul` during migration.
- Return ISO 8601 UTC strings containing `Z`.
- Preserve the existing relative-time UI and one-minute refresh behavior.
- Add a Java comment explaining why item audit timestamps use UTC `Instant`.

---

### Task 1: UTC item audit timestamps and PostgreSQL migration

**Files:**
- Create: `backend/src/test/java/com/save/item/ItemTimestampTest.java`
- Modify: `backend/src/test/java/com/save/MarketplaceIntegrationTest.java:55-70`
- Modify: `backend/src/main/java/com/save/item/Item.java:44-110`
- Modify: `backend/src/main/java/com/save/item/ItemResponse.java:1-50`
- Create: `backend/src/main/resources/db/migration/V4__convert_item_timestamps_to_timestamptz.sql`

**Interfaces:**
- Changes: `Item.getCreatedAt() -> Instant`
- Changes: `Item.getUpdatedAt() -> Instant`
- Changes: `ItemResponse.createdAt() -> Instant`
- Changes: `ItemResponse.updatedAt() -> Instant`
- Produces: PostgreSQL `items.created_at TIMESTAMPTZ` and `items.updated_at TIMESTAMPTZ`

- [ ] **Step 1: Write a failing entity timestamp test**

```java
package com.save.item;

import static org.assertj.core.api.Assertions.assertThat;

import com.save.user.User;
import java.time.Instant;
import java.util.TimeZone;
import org.junit.jupiter.api.Test;

class ItemTimestampTest {
    @Test
    void createsUtcInstantsWhenTheJvmDefaultTimezoneIsSeoul() {
        TimeZone original = TimeZone.getDefault();
        try {
            TimeZone.setDefault(TimeZone.getTimeZone("Asia/Seoul"));
            Item item = new Item("시간 테스트 물품", new User("시간 테스트 사용자"));
            Instant before = Instant.now();

            item.prePersist();

            assertThat(item.getCreatedAt()).isBetween(before, Instant.now());
            assertThat(item.getUpdatedAt()).isEqualTo(item.getCreatedAt());
        } finally {
            TimeZone.setDefault(original);
        }
    }
}
```

- [ ] **Step 2: Add a failing API contract assertion**

In `MarketplaceIntegrationTest.frontendMarketplaceFlowUsesImplementedApis`, append these expectations to the item creation request:

```java
.andExpect(jsonPath("$.created_at").value(matchesPattern(".*Z$")))
.andExpect(jsonPath("$.updated_at").value(matchesPattern(".*Z$")))
```

Add this static import:

```java
import static org.hamcrest.Matchers.matchesPattern;
```

- [ ] **Step 3: Run focused backend tests and verify RED**

Run:

```bash
./gradlew test --tests com.save.item.ItemTimestampTest --tests com.save.MarketplaceIntegrationTest
```

Expected: compilation failure because `Item` still returns `LocalDateTime`, or assertion failure because the JSON timestamps do not end in `Z`.

- [ ] **Step 4: Replace item audit timestamps with `Instant` and add the requested Java comment**

In `Item.java`, import `java.time.Instant`, remove the `LocalDateTime` import, and use:

```java
    /**
     * 게시물 감사 시각은 서버 기본 시간대와 무관한 UTC 절대 시각으로 저장한다.
     * 사용자 현지 시간 변환은 API를 소비하는 화면의 표시 단계에서 수행한다.
     */
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() { updatedAt = Instant.now(); }
```

Change both getters to return `Instant`.

In `ItemResponse.java`, import `java.time.Instant` and change the two audit timestamp record components from `LocalDateTime` to `Instant`. Keep `ItemResponse.from` unchanged because the entity getters now return `Instant`.

- [ ] **Step 5: Add the PostgreSQL Flyway migration**

```sql
ALTER TABLE items
    ALTER COLUMN created_at TYPE TIMESTAMPTZ
    USING created_at AT TIME ZONE 'Asia/Seoul';

ALTER TABLE items
    ALTER COLUMN updated_at TYPE TIMESTAMPTZ
    USING updated_at AT TIME ZONE 'Asia/Seoul';
```

- [ ] **Step 6: Run focused backend tests and verify GREEN**

Run the Step 3 command again.

Expected: `ItemTimestampTest` and `MarketplaceIntegrationTest` PASS, including H2 persistence and `Z` JSON assertions.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/save/item/Item.java backend/src/main/java/com/save/item/ItemResponse.java backend/src/main/resources/db/migration/V4__convert_item_timestamps_to_timestamptz.sql backend/src/test/java/com/save/item/ItemTimestampTest.java backend/src/test/java/com/save/MarketplaceIntegrationTest.java
git commit -m "feat: store item timestamps as UTC instants"
```

### Task 2: Frontend UTC response contract

**Files:**
- Modify: `src/utils/relativeTime.test.js:1-25`
- Modify: `src/api/normalizers.test.js:10-60`

**Interfaces:**
- Consumes: backend timestamp strings such as `2026-08-06T02:55:00Z`
- Preserves: `normalizeItem(...).createdAt -> string`
- Preserves: `formatRelativeTime(value, now) -> string`

- [ ] **Step 1: Update the formatter fixture to the real UTC contract**

Replace the five-minute formatter fixture with the equivalent UTC instant:

```js
['2026-08-06T02:55:00Z', '5분 전'],
```

- [ ] **Step 2: Update the normalizer fixture to the real UTC contract**

Replace the snake-case item timestamp fixture and expectation with:

```js
created_at: '2026-08-06T02:55:00Z',
// expected
createdAt: '2026-08-06T02:55:00Z',
```

Keep the camel-case compatibility test so older or alternate API wrappers remain supported.

- [ ] **Step 3: Run the frontend contract tests**

Run:

```bash
npm test -- --run src/utils/relativeTime.test.js src/api/normalizers.test.js src/pages/HomePage.test.jsx src/ProductDetailPage.owner.test.jsx
```

Expected: all selected tests PASS without production JavaScript changes.

- [ ] **Step 4: Run complete verification**

Run backend tests:

```bash
./gradlew test
```

Run frontend verification:

```bash
npm test -- --run
npm run lint
npm run build
```

Expected: all backend and frontend tests PASS, ESLint exits with zero errors, and Vite completes the production build.

- [ ] **Step 5: Commit**

```bash
git add src/utils/relativeTime.test.js src/api/normalizers.test.js
git commit -m "test: align item time fixtures with UTC API"
```
