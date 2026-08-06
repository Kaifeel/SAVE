# Item Relative Time Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show each recent item's age on the home and detail screens and refresh the relative label every minute without another API request.

**Architecture:** Preserve the backend timestamp in the normalized item model, format it through one pure utility, and obtain a periodically refreshed `now` value from one visibility-aware React hook. Both screens consume the same utility and hook so their labels stay consistent.

**Tech Stack:** React 19, JavaScript modules, Vitest 4, Testing Library, jsdom

## Global Constraints

- Display less than one minute as `방금 전`, less than one hour in minutes, less than one day in hours, and older values in days.
- Treat future timestamps as `방금 전`.
- Omit the label for a missing or invalid timestamp.
- Refresh every 60 seconds only while the document is visible, and refresh immediately when it becomes visible.
- Do not issue an API request to refresh relative time.
- Do not add a date library or change the backend schema/API.
- Limit UI changes to the home `방금 올라왔어요` list and the item detail screen.

---

### Task 1: Relative-time formatter and visible-page clock

**Files:**
- Create: `src/utils/relativeTime.js`
- Create: `src/utils/relativeTime.test.js`
- Create: `src/hooks/useNow.js`
- Create: `src/hooks/useNow.test.jsx`

**Interfaces:**
- Produces: `formatRelativeTime(value, now = Date.now()) -> string`
- Produces: `useNow(refreshInterval = 60_000) -> number`
- Consumes: browser `document.visibilityState`, `visibilitychange`, `setInterval`, and `clearInterval`

- [ ] **Step 1: Write failing formatter tests**

```js
import { describe, expect, it } from 'vitest'
import { formatRelativeTime } from './relativeTime'

const NOW = Date.parse('2026-08-06T12:00:00+09:00')

describe('formatRelativeTime', () => {
  it.each([
    ['2026-08-06T11:59:30+09:00', '방금 전'],
    ['2026-08-06T11:55:00+09:00', '5분 전'],
    ['2026-08-06T10:00:00+09:00', '2시간 전'],
    ['2026-08-03T12:00:00+09:00', '3일 전'],
    ['2026-08-06T12:01:00+09:00', '방금 전'],
  ])('formats %s as %s', (value, expected) => {
    expect(formatRelativeTime(value, NOW)).toBe(expected)
  })

  it.each([undefined, '', 'not-a-date'])('omits invalid value %s', value => {
    expect(formatRelativeTime(value, NOW)).toBe('')
  })
})
```

- [ ] **Step 2: Run the formatter test and verify RED**

Run: `npm test -- --run src/utils/relativeTime.test.js`

Expected: FAIL because `src/utils/relativeTime.js` does not exist.

- [ ] **Step 3: Implement the minimal formatter**

```js
const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export function formatRelativeTime(value, now = Date.now()) {
  if (!value) return ''
  const createdAt = new Date(value).getTime()
  if (Number.isNaN(createdAt)) return ''

  const elapsed = Math.max(0, now - createdAt)
  if (elapsed < MINUTE) return '방금 전'
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}분 전`
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}시간 전`
  return `${Math.floor(elapsed / DAY)}일 전`
}
```

- [ ] **Step 4: Run the formatter test and verify GREEN**

Run: `npm test -- --run src/utils/relativeTime.test.js`

Expected: PASS with all formatter cases green.

- [ ] **Step 5: Write failing clock-hook tests**

```jsx
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useNow } from './useNow'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-08-06T12:00:00+09:00'))
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

it('refreshes once per minute while visible', () => {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
  const { result } = renderHook(() => useNow())

  act(() => {
    vi.setSystemTime(new Date('2026-08-06T12:01:00+09:00'))
    vi.advanceTimersByTime(60_000)
  })

  expect(result.current).toBe(Date.parse('2026-08-06T12:01:00+09:00'))
})

it('pauses while hidden and refreshes immediately when visible again', () => {
  let visibility = 'hidden'
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility)
  const { result } = renderHook(() => useNow())
  const initial = result.current

  act(() => {
    vi.setSystemTime(new Date('2026-08-06T12:03:00+09:00'))
    vi.advanceTimersByTime(180_000)
  })
  expect(result.current).toBe(initial)

  act(() => {
    visibility = 'visible'
    document.dispatchEvent(new Event('visibilitychange'))
  })
  expect(result.current).toBe(Date.parse('2026-08-06T12:03:00+09:00'))
})
```

- [ ] **Step 6: Run the hook test and verify RED**

Run: `npm test -- --run src/hooks/useNow.test.jsx`

Expected: FAIL because `src/hooks/useNow.js` does not exist.

- [ ] **Step 7: Implement the visibility-aware clock hook**

```js
import { useEffect, useState } from 'react'

export function useNow(refreshInterval = 60_000) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let intervalId = null

    const stop = () => {
      if (intervalId !== null) clearInterval(intervalId)
      intervalId = null
    }
    const start = () => {
      if (intervalId === null) {
        intervalId = setInterval(() => setNow(Date.now()), refreshInterval)
      }
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setNow(Date.now())
        start()
      } else {
        stop()
      }
    }

    handleVisibilityChange()
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [refreshInterval])

  return now
}
```

- [ ] **Step 8: Run both unit tests and verify GREEN**

Run: `npm test -- --run src/utils/relativeTime.test.js src/hooks/useNow.test.jsx`

Expected: PASS with no timer leakage warnings.

- [ ] **Step 9: Commit**

```bash
git add src/utils/relativeTime.js src/utils/relativeTime.test.js src/hooks/useNow.js src/hooks/useNow.test.jsx
git commit -m "feat: add live relative time utilities"
```

### Task 2: Preserve item creation timestamps

**Files:**
- Modify: `src/api/normalizers.js:15-53`
- Modify: `src/api/normalizers.test.js:11-50`
- Modify: `src/data/items.js:126-174`
- Modify: `src/App.jsx:344-368`

**Interfaces:**
- Consumes: canonical API fields `created_at` or `createdAt`
- Produces: normalized item property `createdAt: string | undefined`
- Produces: local recent items and newly created local items with ISO `createdAt` strings

- [ ] **Step 1: Add a failing normalization assertion**

Add `created_at: '2026-08-06T11:55:00+09:00'` to the canonical Spring response fixture and add this expected property:

```js
createdAt: '2026-08-06T11:55:00+09:00',
```

Add a second focused test for camelCase:

```js
it('preserves a camel-case item creation timestamp', () => {
  expect(normalizeItem({
    id: 8,
    title: '충전기',
    createdAt: '2026-08-06T11:58:00+09:00',
  })).toMatchObject({
    createdAt: '2026-08-06T11:58:00+09:00',
  })
})
```

- [ ] **Step 2: Run the normalization test and verify RED**

Run: `npm test -- --run src/api/normalizers.test.js`

Expected: FAIL because normalized items do not contain `createdAt`.

- [ ] **Step 3: Preserve the API timestamp**

Add this property to the object returned by `normalizeItem`:

```js
createdAt: item.created_at ?? item.createdAt,
```

- [ ] **Step 4: Run the normalization test and verify GREEN**

Run: `npm test -- --run src/api/normalizers.test.js`

Expected: PASS.

- [ ] **Step 5: Supply local timestamps**

Near the top of `src/data/items.js`, add:

```js
const minutesAgo = minutes => new Date(Date.now() - minutes * 60_000).toISOString()
```

Give recent fixture item 7 `createdAt: minutesAgo(5)` and item 8 `createdAt: minutesAgo(12)`. In `handleCreateItem` inside `src/App.jsx`, add this field to `newItem`:

```js
createdAt: new Date().toISOString(),
```

- [ ] **Step 6: Run data-bound tests and build**

Run: `npm test -- --run src/api/normalizers.test.js src/hooks/useMyPageData.test.jsx src/hooks/useRecommendations.test.jsx`

Expected: all selected tests PASS.

Run: `npm run build`

Expected: Vite build completes successfully.

- [ ] **Step 7: Commit**

```bash
git add src/api/normalizers.js src/api/normalizers.test.js src/data/items.js src/App.jsx
git commit -m "feat: preserve item creation timestamps"
```

### Task 3: Show live relative time on the home screen

**Files:**
- Create: `src/pages/HomePage.test.jsx`
- Modify: `src/pages/HomePage.jsx:1-180`

**Interfaces:**
- Consumes: `useNow() -> number`
- Consumes: `formatRelativeTime(item.createdAt, now) -> string`
- Produces: one current relative-time label per recent item with a valid timestamp

- [ ] **Step 1: Write failing home-screen tests**

Create a shared complete props object and render one recent item:

```jsx
import { act, cleanup, render, screen } from '@testing-library/react'
import { Camera } from 'lucide-react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import HomePage from './HomePage'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-08-06T12:00:00+09:00'))
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

const props = {
  searchQuery: '',
  setSearchQuery: vi.fn(),
  recommendItems: [],
  setSelectedItem: vi.fn(),
  homePopularItems: [],
  setActiveTab: vi.fn(),
  filteredItems: [{ id: 7 }],
  recommendationHeadline: '',
  recommendationError: null,
  onRefreshRecommendations: vi.fn(),
}

it('shows the actual age of each recent item', () => {
  render(<HomePage {...props} recentItems={[{
    id: 7,
    title: '우산',
    price: 1000,
    priceType: '일',
    location: '누리관 앞',
    imageIcon: Camera,
    iconColor: 'text-rose-500 bg-rose-50',
    createdAt: '2026-08-06T11:55:00+09:00',
  }]} />)

  expect(screen.getByText('5분 전')).toBeInTheDocument()
})

it('updates the visible age after one minute', () => {
  render(<HomePage {...props} recentItems={[{
    id: 7,
    title: '우산',
    price: 1000,
    priceType: '일',
    location: '누리관 앞',
    imageIcon: Camera,
    iconColor: 'text-rose-500 bg-rose-50',
    createdAt: '2026-08-06T11:55:00+09:00',
  }]} />)

  act(() => {
    vi.setSystemTime(new Date('2026-08-06T12:01:00+09:00'))
    vi.advanceTimersByTime(60_000)
  })

  expect(screen.getByText('6분 전')).toBeInTheDocument()
})

it('omits the age when a recent item has no valid creation time', () => {
  render(<HomePage {...props} recentItems={[{
    id: 8,
    title: '충전기',
    price: 1000,
    priceType: '시간',
    location: '도서관 앞',
    imageIcon: Camera,
    iconColor: 'text-rose-500 bg-rose-50',
  }]} />)

  expect(screen.queryByText(/전$/)).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run the home test and verify RED**

Run: `npm test -- --run src/pages/HomePage.test.jsx`

Expected: FAIL because the component still renders the fixed text `방금 전` and never renders `5분 전`.

- [ ] **Step 3: Render calculated time**

Import `useNow` and `formatRelativeTime`, call `const now = useNow()` once inside `HomePage`, and replace the fixed span with:

```jsx
{formatRelativeTime(item.createdAt, now) && (
  <span className="text-[10px] text-slate-400 font-medium">
    {formatRelativeTime(item.createdAt, now)}
  </span>
)}
```

Refactor the map body to calculate `const relativeTime = formatRelativeTime(item.createdAt, now)` once and render that variable rather than calling the formatter twice.

- [ ] **Step 4: Run the home test and verify GREEN**

Run: `npm test -- --run src/pages/HomePage.test.jsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/HomePage.jsx src/pages/HomePage.test.jsx
git commit -m "feat: show recent item age on home"
```

### Task 4: Show live relative time on item details

**Files:**
- Modify: `src/ProductDetailPage.owner.test.jsx:1-80`
- Modify: `src/ProductDetailPage.jsx:1-115`

**Interfaces:**
- Consumes: `useNow() -> number`
- Consumes: `formatRelativeTime(item.createdAt, now) -> string`
- Produces: a current relative-time label beside the detail metadata when the timestamp is valid

- [ ] **Step 1: Write failing detail tests**

Add stable fake time setup and include `createdAt` in the shared item fixture:

```jsx
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-08-06T12:00:00+09:00'))
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

// in item
createdAt: '2026-08-06T11:55:00+09:00',
```

Add these tests:

```jsx
it('shows the item creation time as a relative age', () => {
  render(<ProductDetailPage item={item} onClose={vi.fn()} />)
  expect(screen.getByText('5분 전')).toBeInTheDocument()
})

it('omits the creation time when it is invalid', () => {
  render(<ProductDetailPage item={{ ...item, createdAt: 'invalid' }} onClose={vi.fn()} />)
  expect(screen.queryByText(/분 전$/)).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run the detail test and verify RED**

Run: `npm test -- --run src/ProductDetailPage.owner.test.jsx`

Expected: FAIL because `5분 전` is absent.

- [ ] **Step 3: Render calculated time in the metadata row**

Import `useNow` and `formatRelativeTime`, then add:

```js
const now = useNow()
const relativeTime = formatRelativeTime(item.createdAt, now)
```

After the location metadata and before the rating metadata, render:

```jsx
{relativeTime && <span>{relativeTime}</span>}
```

- [ ] **Step 4: Run the detail and home tests and verify GREEN**

Run: `npm test -- --run src/ProductDetailPage.owner.test.jsx src/pages/HomePage.test.jsx`

Expected: PASS.

- [ ] **Step 5: Run complete verification**

Run: `npm test -- --run`

Expected: all tests PASS with no errors or warnings.

Run: `npm run lint`

Expected: ESLint exits successfully.

Run: `npm run build`

Expected: Vite production build completes successfully.

- [ ] **Step 6: Commit**

```bash
git add src/ProductDetailPage.jsx src/ProductDetailPage.owner.test.jsx
git commit -m "feat: show item age on details"
```
