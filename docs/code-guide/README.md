# SAVE 코드 학습 가이드

이 문서는 코드를 처음 읽는 컴퓨터공학 전공자가 SAVE 프로젝트를 **실행하고, 흐름을 추적하고, 면접에서 설명하는 것**을 목표로 한다. 모든 문서는 현재 작업 트리의 코드를 기준으로 작성했다. `node_modules`, `dist`, `backend/build`, Gradle Wrapper 내부처럼 직접 작성하지 않은 생성물·의존성 코드는 해설 대상에서 제외한다.

## 프로젝트를 한 문장으로 설명하면

React 브라우저 화면이 HTTP 또는 WebSocket으로 Spring Boot API를 호출하고, Spring Boot가 PostgreSQL/H2에 사용자·물품·대여·채팅 데이터를 저장하는 교내 물품 대여 서비스다.

## 권장 읽기 순서

1. [01-system-overview.md](01-system-overview.md): 전체 그림과 Controller → Service → Repository 흐름
2. [02-java-spring-basics.md](02-java-spring-basics.md): Java 문법과 Spring/JPA 어노테이션
3. [10-frontend-foundations.md](10-frontend-foundations.md): JavaScript, React, Hook 기초
4. 관심 기능의 도메인 문서: 물품 → 대여 → 인증 → 채팅 순서를 추천
5. [14-end-to-end-flows.md](14-end-to-end-flows.md): 화면 클릭부터 DB까지 실제 추적
6. [15-cs-interview-guide.md](15-cs-interview-guide.md): CS 면접 답변 연습
7. [16-complete-file-index.md](16-complete-file-index.md): 모르는 파일을 발견했을 때 찾아보는 색인

## 문서 지도

| 문서 | 핵심 내용 |
|---|---|
| [01](01-system-overview.md) | 아키텍처, 실행, HTTP 요청 생명주기, 패키지 의존 방향 |
| [02](02-java-spring-basics.md) | Java 클래스·record·enum·interface, DI, Spring/JPA/검증 어노테이션 |
| [03](03-security-auth.md) | 이메일/Google 로그인, JWT, 리프레시 쿠키, Security Filter Chain |
| [04](04-user-university.md) | 사용자, 공개 프로필, 제재 만료, 대학·수령 장소 |
| [05](05-item-wishlist-storage.md) | 물품 CRUD, 찜, 이미지 검증, 로컬/S3 저장 |
| [06](06-rental-review.md) | 대여 상태 머신, 잠금, 상호 후기 공개 정책 |
| [07](07-chat-notification.md) | 채팅방, 메시지, STOMP WebSocket, 앱 안/FCM 알림 |
| [08](08-report-admin-recommendation.md) | 신고·관리자·제재, OpenAI 추천 |
| [09](09-database.md) | 테이블 관계, JPA 매핑, Flyway, 인덱스와 트랜잭션 |
| [10](10-frontend-foundations.md) | React 렌더링, state/props, Hook, Zustand, Tailwind |
| [11](11-frontend-pages-components.md) | `App.jsx`, 모든 페이지와 컴포넌트 |
| [12](12-frontend-api-state.md) | API 모듈, 정규화, 커스텀 Hook, 낙관적 업데이트 |
| [13](13-testing-guide.md) | Vitest/JUnit/MockMvc/Mockito 테스트 전체 지도 |
| [14](14-end-to-end-flows.md) | 로그인·물품·대여·채팅 등 기능별 전체 호출 흐름 |
| [15](15-cs-interview-guide.md) | 이 프로젝트에 근거한 CS 질문과 답변 |
| [16](16-complete-file-index.md) | 운영·테스트·설정 파일의 역할 전체 색인 |

## 처음 실행하고 검증하기

필수 도구는 Node.js/npm과 JDK 17이다. 터미널 두 개에서 프론트와 백엔드를 각각 실행한다.

```bash
# 터미널 1: 프론트엔드
cd /home/user/projects/SAVE
npm install
npm run dev

# 터미널 2: 백엔드(dev profile, H2)
cd /home/user/projects/SAVE/backend
./gradlew bootRun
```

Windows에서는 백엔드 폴더에서 `gradlew.bat bootRun`을 사용한다. Google 로그인은 프론트의 `VITE_GOOGLE_CLIENT_ID`와 백엔드 `GOOGLE_CLIENT_ID`가 같아야 한다. 자세한 환경변수는 저장소 루트의 `README.md`와 `backend/README.md`를 참고한다.

코드 변경 뒤 기본 검증 명령은 다음과 같다.

```bash
cd /home/user/projects/SAVE
npm run test:run
npm run lint
npm run build
cd backend
./gradlew test
```

Gradle Wrapper는 첫 실행 시 Gradle을 내려받으므로 인터넷 연결이 한 번 필요할 수 있다.

## 코드를 읽는 공통 공식

백엔드 REST 기능은 보통 다음 순서다.

```text
HTTP 요청
  → Security Filter
  → Controller: URL/JSON/JWT를 Java 값으로 변환
  → Service: 권한, 상태, 계산, 트랜잭션 처리
  → Repository: JPA를 통해 DB 조회/저장
  → Entity: 데이터와 상태 변경 메서드
  → Response record: 외부에 공개할 JSON 형태
```

프론트 기능은 보통 다음 순서다.

```text
클릭/입력
  → Page 또는 Component의 이벤트 함수
  → Custom Hook: 로딩·오류·화면 state 관리
  → src/api 함수
  → fetch HTTP 요청
  → 백엔드 JSON 응답
  → normalizer가 화면용 객체로 변환
  → setState/Zustand 변경
  → React 재렌더링
```

## 학습할 때 지켜야 할 기준

- 코드를 외우지 말고 입력, 출력, 부작용(DB 저장·state 변경), 실패 조건을 찾는다.
- `Controller → Service → Repository → Entity`를 세로로 한 번 추적한다.
- 이름을 모르는 함수는 먼저 “표준 Java/브라우저/React 함수인가, 프로젝트 함수인가”를 구분한다.
- 테스트는 사용 예제다. 구현이 복잡하면 같은 이름의 테스트에서 기대 동작을 먼저 본다.
- 현재 프론트는 네이티브 모바일 앱이 아니다. 폭 430px 중심으로 만든 반응형 React 웹이다.

## 문서의 한계

이 문서는 읽기 지도이지 언어 공식 명세를 복제한 책은 아니다. 단순 getter/setter는 묶어서 설명하지만, 프로젝트가 정의한 기능성 메서드와 호출 관계는 색인과 도메인 문서에 포함한다. 현재 작업 중인 보안 파일의 미커밋 변경도 현재 코드 동작으로 반영했다.
