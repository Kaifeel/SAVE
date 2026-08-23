# 08. 신고, 관리자, AI 추천

## 신고 생성

```text
ProductDetail/UserProfile
→ ReportModal
→ api/reports.createReport
→ ReportController.create
→ ReportService.create
→ ReportRepository.save
```

`ReportCreateRequest`는 reportedUserId, itemId, chatRoomId 중 적어도 하나가 있는지 `@AssertTrue isTargetPresent()`로 검사하고, trim한 reason이 10~1000자인지 `isDetailedReasonValid()`로 검사한다.

`ReportService.create()`는 reporter와 선택한 사용자·물품·채팅방 ID가 실제 존재하는지 각각 확인하고 `Report`를 저장한다. 현재 구현은 자기 신고 여부나 여러 target 사이의 관계까지는 검사하지 않는다. 이는 악용 방지를 위해 추가할 수 있는 검증 지점이다. Report는 `PENDING → REVIEWING → RESOLVED/REJECTED` 상태와 처리 시각을 기록한다.

## 관리자 기능

`AdminController`는 `/api/v1/admin` 아래에 있으며 `@PreAuthorize`/SecurityConfig로 ADMIN만 접근한다.

- `reports()`: 최신 신고 목록
- `report(id)`: 상세
- `updateStatus`: 허용 `ReportStatus`로 전환
- `deleteItem`: 신고 대상 물품 soft delete
- `sanction(userId, request)`: 사용자 SUSPENDED 처리와 사유 저장

프론트 `AdminPage`는 `defaultApi`를 주입 가능하게 만들어 테스트에서 fake API를 쓸 수 있다. `loadReports`, `openReport`, `changeStatus`, `removeItem`, `sanctionUser`가 각각 API를 호출하고 현재 목록/선택 항목을 갱신한다. `useMemo`의 `counts/filteredReports`는 원본 state를 변경하지 않고 파생한다.

## 추천 요청 흐름

```text
useRecommendations.refresh
→ POST /api/v1/recommendations
→ RecommendationController.recommend
→ RecommendationService.recommend
   → 같은 대학, AVAILABLE, 타인 물품 최대 50개 후보
   → RecommendationAiPort.recommend
      → OpenAiRecommendationClient
   → AI item_id를 서버 후보 Map으로 재검증·중복 제거·최대 3개
   → RecommendationRepository.save
→ RecommendationResponse
→ normalizeItem 후 HomePage 추천 영역
```

## 왜 Port interface가 있는가

`RecommendationService`는 구체적인 HTTP client가 아니라 `RecommendationAiPort`에 의존한다. 실제 구현은 `OpenAiRecommendationClient`다. 테스트에서는 가짜 Port를 넣을 수 있고, 나중에 다른 추천 엔진으로 바꿔도 Service 규칙을 유지할 수 있다. Dependency Inversion의 작은 사례다.

## OpenAiRecommendationClient

- `recommend(input)`: API key 검사, Responses API 호출, 결과 검증
- `requestBody(input)`: system/user input과 strict JSON Schema 구성
- `structuredOutput(response)`: output content에서 refusal 또는 output_text 탐색
- model 반환은 headline과 `{itemId, reason}` 최대 3개
- 네트워크/파싱 오류는 502 `BusinessException`, key 없음은 503

AI 출력은 신뢰 경계 밖의 입력이다. 그래서 `RecommendationService`가 DB 후보에 실제 존재하는 ID만 허용하고 `seen` 집합으로 중복을 제거한다. 모델이 임의 ID를 만들어도 저장되지 않는다.

`Recommendation` Entity는 요청 context, headline/reason, 추천 물품을 저장한다. 문자열 목록은 `@ElementCollection`, 물품 목록은 `@ManyToMany`와 중간 테이블로 표현한다. `history`는 내 기록만, `detail`은 소유자 ID를 검사해 다른 사용자의 추천을 403으로 막는다.

## 면접 연결

**Q. 외부 API 오류를 왜 502로 감싸나요?**

우리 서버는 요청을 받았지만 upstream의 정상 응답을 얻지 못했다는 의미를 클라이언트에 전달하고, 외부 SDK/파싱 예외의 내부 정보를 숨긴다.

**Q. AI 결과에 서버 검증이 필요한 이유는?**

언어 모델 출력은 확률적이며 prompt만으로 DB 무결성과 권한을 보장할 수 없다. 구조화 출력은 형식을 강화하지만 값의 업무 유효성은 서버가 허용 목록으로 다시 검증해야 한다.

**Q. 관리자 endpoint 보안은 어디에서 하나요?**

URL 수준 SecurityConfig와 method 수준 `@PreAuthorize`를 겹쳐 방어한다. UI에서 버튼을 숨기는 것은 보안이 아니며 서버가 최종 인가해야 한다.
