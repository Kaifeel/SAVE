# SAVE GCP 비공개 베타 배포안

## 결정

SAVE의 첫 비공개 베타와 전시회 백엔드는 Google Cloud Platform에 배포한다.
현재 Spring Boot 백엔드의 Docker, PostgreSQL, S3 호환 스토리지 경계를
유지하면서 다음 관리형 서비스를 사용한다.

| 역할 | GCP 서비스 |
| --- | --- |
| Spring Boot API 및 WebSocket | Cloud Run |
| 컨테이너 이미지 | Artifact Registry |
| 운영 데이터베이스 | Cloud SQL for PostgreSQL |
| 물품 이미지 | Cloud Storage |
| 운영 비밀값 | Secret Manager |
| 푸시 알림 | Expo Push Service |
| 애플리케이션 로그 | Cloud Logging |

Cloud Run은 현재 `backend/Dockerfile`이 노출하는 8080 포트와 맞고 HTTPS 및
WebSocket을 지원한다. 사용량이 없을 때 인스턴스를 0으로 줄일 수 있어 초기
비공개 베타에 적합하다.

## 배포 구조

```text
Expo Android 앱
        |
        | HTTPS / WebSocket
        v
Cloud Run (Spring Boot, prod 프로필)
        |---------------- Cloud SQL for PostgreSQL
        |---------------- Cloud Storage
        |---------------- Expo Push Service
        `---------------- Secret Manager / Cloud Logging
```

현재 채팅은 애플리케이션 내부 STOMP 브로커를 사용하므로 비공개 베타에서는
Cloud Run 최대 인스턴스를 1로 제한한다. 여러 인스턴스로 확장하기 전에는 외부
메시지 브로커를 도입해야 한다. 평소에는 최소 인스턴스를 0으로 두고, 콜드
스타트가 시연을 방해하지 않도록 전시회 당일에는 최소 인스턴스를 1로 둔다.

## Cloud Storage를 현재 S3 코드로 사용하기

`S3ObjectStorage`는 endpoint와 정적 자격 증명을 설정할 수 있으므로 Cloud
Storage의 S3 호환 XML API와 HMAC 키를 사용할 수 있다.

```dotenv
S3_ENDPOINT=https://storage.googleapis.com
S3_REGION=auto
S3_BUCKET=save-item-images
S3_ACCESS_KEY=GCP_HMAC_ACCESS_ID
S3_SECRET_KEY=GCP_HMAC_SECRET
S3_PUBLIC_BASE_URL=https://storage.googleapis.com/save-item-images
S3_PATH_STYLE_ACCESS_ENABLED=true
```

물품 이미지 URL을 공개 URL로 반환하는 현재 계약을 유지하려면 해당 버킷의
객체 읽기 정책을 별도로 구성해야 한다. 사용자 개인정보나 비공개 파일은 이
공개 버킷에 저장하지 않는다.

## 운영 환경변수와 비밀값

Cloud Run은 `SPRING_PROFILES_ACTIVE=prod`로 실행한다. 다음 값은 Secret Manager
또는 Cloud Run 환경설정으로 제공한다.

```dotenv
SPRING_PROFILES_ACTIVE=prod
DB_URL=jdbc:postgresql://DB_HOST:5432/save
DB_USERNAME=save
DB_PASSWORD=...
JWT_SECRET=32자 이상의 무작위 비밀값
CORS_ALLOWED_ORIGINS=https://관리자웹도메인
GOOGLE_CLIENT_ID=운영용_Google_Client_ID
GOOGLE_REDIRECT_SUCCESS_URI=https://관리자웹도메인
EXPO_PUSH_ENABLED=true
OPENAI_API_KEY=...
S3_ENDPOINT=https://storage.googleapis.com
S3_REGION=auto
S3_BUCKET=save-item-images
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_PUBLIC_BASE_URL=https://storage.googleapis.com/save-item-images
S3_PATH_STYLE_ACCESS_ENABLED=true
```

Google Client ID는 공개 식별자지만, DB 비밀번호, JWT Secret, HMAC Secret,
OpenAI API Key는 저장소에 커밋하지 않는다. Expo Push 기본 전송에는 별도
서비스 계정 파일이 필요하지 않다.

## 구현 및 배포 순서

1. Windows와 WSL 중 하나의 저장소를 공식 작업 기준으로 확정한다.
2. 백엔드 전체 테스트와 Docker 이미지를 검증한다.
3. GCP 프로젝트와 결제 알림을 설정한다.
4. Artifact Registry에 백엔드 이미지를 올린다.
5. Cloud SQL PostgreSQL 인스턴스와 `save` 데이터베이스를 만든다.
6. Cloud Storage 버킷과 전용 HMAC 키를 만든다.
7. Secret Manager에 운영 비밀값을 등록한다.
8. Cloud Run에 최대 인스턴스 1로 배포한다.
9. `/actuator/health`, 로그인, 이미지 업로드, 채팅, 대여 전체 흐름을 확인한다.
10. Cloud SQL 자동 백업과 Cloud Logging 오류 알림을 설정한다.
11. Expo 앱의 운영 API URL을 Cloud Run HTTPS URL로 변경한다.
12. EAS 내부 배포 APK로 비공개 베타를 시작한다.
13. 전시회 당일 Cloud Run 최소 인스턴스를 1로 변경한다.

## 출시 전 완료 조건

- Flyway 마이그레이션과 PostgreSQL 스키마 검증이 성공한다.
- 물품 이미지 업로드와 공개 조회가 성공한다.
- WebSocket 재연결 후 채팅과 알림이 복구된다.
- 서버 재시작 후에도 사용자, 대여, 알림 데이터가 유지된다.
- DB 백업 복구 절차를 한 번 실행해 본다.
- 비밀값이 Git, 이미지 레이어, 로그에 포함되지 않는다.
- 비공개 베타 사용자의 개인정보 처리 및 삭제 절차가 준비된다.

## 참고 문서

- [Cloud Run 개요](https://docs.cloud.google.com/run/docs/overview/what-is-cloud-run)
- [Cloud Run 컨테이너 배포](https://docs.cloud.google.com/run/docs/deploying)
- [Cloud Storage S3 호환성](https://docs.cloud.google.com/storage/docs/interoperability)
- [Amazon S3에서 Cloud Storage로 단순 이전](https://docs.cloud.google.com/storage/docs/aws-simple-migration)
- [Expo 내부 배포](https://docs.expo.dev/tutorial/eas/internal-distribution-builds/)
