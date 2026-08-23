# 05. 물품, 찜, 이미지 저장

## 물품 API 구조

```text
ItemController
  → ItemService
      → ItemRepository
      → UserRepository
      → PickupLocationRepository
      → WishlistRepository
      → ReviewQueryService
      → PhotoStorageService
          → UploadPolicy
          → ObjectStorage
              ├─ LocalObjectStorage (!prod)
              └─ S3ObjectStorage (prod)
```

## ItemController

- `list(...)`: type, query, available, sort, page, size, universityId를 받아 목록 조회
- `detail(itemId, jwt)`: 상세 조회. 로그인 정보가 있으면 찜 여부도 계산
- `createJson/createMultipart`: 사진 유무에 따라 JSON 또는 multipart 요청 처리
- `updateJson/updateMultipart`: 소유자 물품 수정
- `updateStatus`: 현재는 대여 흐름 우회를 막기 위해 Service가 충돌 응답
- `delete`: 실제 행 삭제가 아닌 `DELETED` 상태로 soft delete
- `userId(jwt)`: JWT subject 문자열을 Integer 사용자 ID로 변환

같은 URL에 `consumes`만 다른 메서드가 있는 이유는 사진이 없는 JSON과 파일이 포함된 multipart를 모두 받기 위해서다. multipart는 `@ModelAttribute ItemUpsertRequest`로 필드와 파일을 바인딩한다.

## ItemService 메서드

### `list(...)`

삭제되지 않은 물품을 대학 조건으로 조회한 뒤 type, 검색어, 대여 가능 여부를 filter하고 인기순 또는 최신순 정렬한다. page/size를 안전 범위로 보정하고 부분 목록을 `ItemPageResponse`에 넣는다. 현재 일부 필터·페이지 처리가 Java 메모리에서 일어나므로 데이터가 커지면 DB `Pageable` 쿼리로 옮겨야 한다.

### `detail(...)`

`findVisible()`로 삭제 물품을 숨기고 조회 수를 올린다. `response()`는 로그인 사용자의 찜 여부, 전체 찜 수, 소유자 후기 요약까지 합쳐 `ItemResponse`를 만든다.

### `create/update/delete`

- `validate`: 제목과 대여료 기본 규칙
- `normalizeType`: rent/lend → LEND, want/request/borrow → BORROW
- `normalizeRentalUnit`: 한국어/영문 단위를 `RentalUnit` enum으로 변환
- `findPickupLocation`: 장소가 존재하며 소유자의 대학에 속하는지 검사
- `PhotoStorageService.store`: 새 파일 검증·저장 후 URL 목록 반환
- `findOwned`: 존재 여부와 현재 사용자 소유권 검사
- `delete`: `markDeleted()`만 호출하여 참조 무결성과 기록을 보존

## Item Entity

중요 동작은 `update`, `replaceImages`, `changeStatus`, `markDeleted`, `increaseViewCount`다. `replaceImages`는 기존 `ItemImage` 목록을 비운 뒤 입력 순서대로 다시 만든다. `orphanRemoval=true` 관계이면 목록에서 제거된 이미지 Entity 행도 삭제된다.

`ItemStatus`는 `AVAILABLE`, `REQUEST_PENDING`, `RESERVED`, `RENTED`, `DELETED` 등의 상태다. 대여 상태와 함께 바뀌므로 일반 물품 상태 endpoint로 임의 변경하지 못하게 했다.

`ItemImage`는 물품, URL, 표시 순서, 생성 시각을 가진다. `ItemResponse.from()`은 Entity를 JSON용 record로 만들고 대표 이미지/이미지 URL, 소유자·대학·장소, 찜/후기 통계를 포함한다.

## 찜

```text
ProductDetailPage 버튼
→ App의 onToggleWishlist (화면을 먼저 낙관적 변경)
→ addWishlist/removeWishlist
→ WishlistController
→ WishlistService
→ WishlistRepository
```

`WishlistService.add()`는 기존 찜이면 그대로 반환해 멱등적으로 동작한다. 사용자/물품 존재, 삭제 상태, 본인 물품 여부를 검사하고 저장한다. DB의 `(user_id,item_id)` unique constraint가 동시 중복 삽입도 최종 방어한다. `remove()`는 존재할 때만 삭제해 반복 요청에도 안전하다.

## 이미지 보안

확장자와 HTTP Content-Type만 믿으면 실행 파일의 이름만 `.png`로 바꾼 공격을 허용할 수 있다. `UploadPolicy.validate()`는 다음을 모두 확인한다.

1. 빈 파일 여부와 최대 크기
2. 허용 확장자(jpg/jpeg/png/gif/webp)
3. 선언 MIME과 확장자 일치
4. 실제 byte magic signature
5. WebP 외 형식은 `ImageIO`로 decode 가능 여부
6. 검출 확장자로 canonical name 생성

`ValidatedImage`는 byte 배열을 생성/반환할 때 clone하여 외부에서 내부 배열을 바꾸지 못하게 한다.

`ObjectKeyFactory.itemImage()`는 클라이언트 파일명을 사용하지 않고 UTC 날짜와 UUID로 `items/YYYY/MM/uuid.ext` key를 만든다. 경로 순회와 이름 충돌을 줄인다.

- `LocalObjectStorage`: root 밖으로 resolve되는지 확인하고 로컬 저장, `/uploads/**`로 제공
- `S3ObjectStorage`: bucket/key/content type을 넣어 업로드하고 public URL 구성
- `StorageProperties`: yml의 `storage.*`를 Java 설정 객체로 바인딩
- `PhotoStorageService`: 파일 개수 제한, 각각 validate → store, URL 반환

## 면접 연결

**Soft delete의 장단점:** 참조 중인 대여/신고 기록을 보존하고 복구·감사에 유리하다. 모든 조회에서 삭제 조건을 빠뜨리지 않아야 하고 테이블이 계속 커지는 단점이 있다.

**낙관적 UI와 낙관적 DB lock의 차이:** 프론트 낙관적 업데이트는 성공을 예상해 화면을 먼저 바꾸는 UX 기법이다. DB optimistic locking은 version 충돌을 감지하는 동시성 기법이다. 이 프로젝트의 대여는 후자가 아니라 pessimistic write lock을 쓴다.

**파일 업로드에서 client filename을 신뢰하지 않는 이유:** 경로 순회, 충돌, 특수문자, 실행 가능한 확장자 위장 위험이 있기 때문이다.
