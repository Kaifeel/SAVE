# 10. JavaScript와 React 기초

## JavaScript 모듈

`export`한 값은 다른 파일이 `import`할 수 있다.

```js
export function getItems() { ... }
import { getItems } from './api/items.js'
```

`export default`는 파일의 대표 값 하나다. `{ 이름 }` 없이 가져온다. import는 코드를 복사하는 것이 아니라 같은 module binding에 연결한다.

## 자주 쓰인 문법

| 문법 | 뜻 |
|---|---|
| `const` | binding 재대입 금지. 객체 내부 변경까지 막는 것은 아님 |
| `let` | 재대입 가능한 지역 변수 |
| `===` | 타입 변환 없는 엄격 비교 |
| `?.` | null/undefined이면 멈추는 optional chaining |
| `??` | 왼쪽이 null/undefined일 때만 오른쪽 사용 |
| `...object` | 객체/배열 펼치기와 얕은 복사 |
| `condition ? a : b` | 삼항 조건식 |
| `async/await` | Promise 완료를 기다리는 비동기 문법 |
| `.map()` | 각 원소를 변환한 새 배열 |
| `.filter()` | 조건을 통과한 새 배열 |
| `.find()` | 첫 일치 원소 또는 undefined |
| `.some()` | 하나라도 조건을 만족하는지 |
| `Set/Map` | 중복 없는 집합/키-값 자료구조 |

화살표 함수 `item => item.id`는 `(item) { return item.id }`의 축약이다. `{}`를 쓰면 명시적 `return`이 필요하다.

## JSX

JSX는 HTML처럼 보이지만 JavaScript 표현식이다. 빌드 시 React element 생성 코드로 변환된다.

- `{value}`: JavaScript 값 삽입
- `{condition && <A />}`: 조건부 렌더링
- `{items.map(item => <Card key={item.id} />)}`: 목록 렌더링
- `className`: HTML `class`에 해당
- `onClick={() => ...}`: 함수 자체를 event handler로 전달
- `key`: React가 목록 항목의 정체성을 비교하는 값. 안정적인 DB ID가 좋다.

React는 문자열을 기본 escaping하므로 후기의 `<script>`가 HTML로 실행되지 않고 텍스트가 된다. `dangerouslySetInnerHTML`을 사용하면 별도 sanitize가 필요하다.

## Component와 props

함수 Component는 props를 입력받아 JSX를 반환한다.

```jsx
function BottomNavigation({ activeTab, setActiveTab }) {
  return <button onClick={() => setActiveTab('home')}>홈</button>
}
```

props는 부모가 자식에게 내려주는 읽기 전용 입력이다. 자식이 부모 state를 바꿔야 하면 부모가 callback을 props로 넘긴다. `App.jsx`가 많은 상태와 callback을 페이지에 전달하는 구조다.

## 사용된 React Hook 전부

### `useState(initial)`

렌더 사이에 값을 보존하고 setter 호출 시 다시 렌더한다. `const [items, setItems] = useState([])` 형태다. 이전 state 기반 변경은 `setItems(current => ...)`를 써 stale closure를 피한다.

### `useEffect(effect, dependencies)`

DOM 반영 뒤 네트워크 연결, timer, 구독 같은 외부 동기화를 실행한다. return 함수는 다음 실행/제거 전에 cleanup한다. dependency에 effect가 읽는 외부 값을 정확히 넣어야 한다.

프로젝트 사례:

- 로그인 bootstrap/알림·채팅 목록 로드
- STOMP 연결과 disconnect cleanup
- `useNow`의 interval/visibility listener
- Google script 추가와 listener 정리

### `useMemo(calculate, dependencies)`

의존 값이 같으면 계산 결과를 재사용한다. `filteredItems`, 관리자 필터/통계에 사용한다. 의미상 정확성 도구가 아니라 성능 최적화이므로 side effect를 넣으면 안 된다.

### `useCallback(function, dependencies)`

함수 객체를 재사용한다. Hook 의존성 안정화와 자식 props 불필요 변경 감소에 사용한다. 함수 내부에서 읽는 값은 dependency에 포함해야 한다.

### `useRef(initial)`

값이 바뀌어도 렌더하지 않는 mutable container 또는 DOM 참조다. `authBootstrapStarted`로 StrictMode effect 중복 시작을 막고, `googleButtonRef`로 실제 버튼 DOM을 Google SDK에 전달한다.

### `useContext(Context)`

중간 props 전달 없이 가까운 Provider의 값을 읽는다. `useToast()`가 `ToastContext`를 읽는다. Provider 밖 호출이면 명확한 오류를 던진다.

Hook은 Component 또는 custom Hook 최상단에서만 호출한다. 조건문/반복문 안에서 호출하면 렌더마다 호출 순서가 달라져 React가 state를 연결할 수 없다.

## Zustand

`authStore.js`의 `create(set => ({...}))`가 전역 store Hook을 만든다.

- `accessToken`, `user`, `authStatus`
- `setSession(session)`: 여러 응답 형태에서 token/user를 꺼내 authenticated 설정
- `updateUser(user)`: token 유지한 채 프로필만 변경
- `clearSession()`: session 삭제, anonymous

store에 persistence middleware가 없어서 메모리에만 있다. 새로고침 복구는 HttpOnly cookie로 `/auth/refresh`를 호출한다.

## Promise와 비동기 오류

`await`는 현재 async 함수만 일시 중단한다. UI thread 자체를 block하지 않는다. `try/catch/finally`에서 loading을 true로 바꾸고 성공/실패 후 finally에서 false로 돌리는 패턴이 반복된다.

`Promise.all`은 하나라도 실패하면 전체가 reject한다. `Promise.allSettled`는 일부 새로고침이 실패해도 나머지 결과를 기다린다. `App.handleRentalChanged`가 후자를 사용한다.

## 이벤트와 form

form submit은 기본적으로 페이지 navigation을 하므로 `event.preventDefault()`로 막고 비동기 요청을 한다. input은 `value={state}`, `onChange={e => setState(e.target.value)}`의 controlled component다.

## CSS와 모바일

Tailwind class를 JSX에 직접 조합한다. `sm:`, `lg:`는 breakpoint 이상에서 적용된다. `max-w-[430px]` 컨테이너가 휴대폰 프레임처럼 보이지만 실제 기술은 React 웹이다. `App.css/index.css`는 전역/추가 스타일, Vite Tailwind plugin이 class를 빌드한다.

## 면접 연결

**Virtual DOM:** state 변화로 새 element tree를 만들고 React가 이전 tree와 비교(reconciliation)해 필요한 DOM만 갱신한다. key는 목록 비교의 정체성이다.

**Closure:** handler가 선언 시점 scope의 state를 기억한다. dependency가 잘못된 callback/effect는 오래된 state를 보는 stale closure 버그를 만든다.

**Event loop:** fetch Promise callback은 네트워크 완료 뒤 task/microtask 규칙으로 실행된다. 긴 동기 계산은 여전히 main thread 렌더링을 막는다.
