# SAVE

교내 물품 대여, 채팅, 상호 후기 기능을 제공하는 React + Spring Boot 프로젝트입니다.

## 로컬 실행

프런트엔드는 Node.js와 npm, 백엔드는 JDK 17이 필요합니다. 의존성 폴더는 Git이나
ZIP에 넣지 않고 각 환경에서 다시 설치합니다.

```bash
npm install
npm run dev
```

Windows CMD에서 백엔드를 실행할 때는 다음 명령을 사용합니다.

```bat
cd backend
set GOOGLE_CLIENT_ID=프런트의_VITE_GOOGLE_CLIENT_ID와_같은_값
gradlew.bat bootRun
```

WSL/Linux에서는 다음과 같습니다.

```bash
cd backend
export GOOGLE_CLIENT_ID='프런트의_VITE_GOOGLE_CLIENT_ID와_같은_값'
./gradlew bootRun
```

`.env.local`의 `VITE_` 변수는 Vite 프런트 전용입니다. Spring Boot가 이 파일을
자동으로 읽지는 않으므로 백엔드 값은 환경변수나 Spring 설정으로 전달해야 합니다.

## 인증과 새로고침

액세스 토큰과 사용자 정보는 Zustand 메모리에만 보관하며 `localStorage`와
`sessionStorage`에는 저장하지 않습니다. 새로고침하면 브라우저가 HttpOnly 리프레시
쿠키를 `/api/v1/auth/refresh`로 보내 세션과 최신 프로필을 복구합니다. 따라서 Google
로그인 뒤 학과·대학교 입력을 완료한 사용자도 새로고침 시 입력 화면으로 돌아가지
않습니다.

## 검증

```bash
npm run test:run
npm run lint
npm run build
cd backend && ./gradlew test
```

Windows CMD에서는 마지막 명령 대신 `cd backend` 후 `gradlew.bat test`를 사용합니다.
