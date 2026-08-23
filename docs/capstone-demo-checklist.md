# SAVE 캡스톤 시연 체크리스트

이 문서는 자동 검증과 실제 기기 리허설을 구분한다. 기기에서 실행하지 않은
항목은 성공으로 간주하지 않고 `Not run`으로 유지한다. 계정, 토큰, 자격 증명,
내부 APK URL은 기록하지 않는다.

## 빌드 정보

| 항목 | 기록 |
| --- | --- |
| 리허설 날짜 | Not run |
| Git 커밋 | 실행 시 기록 |
| EAS Android build ID | Not run |
| Android APK 보관 위치 | EAS 내부 배포 페이지(공개 문서에 URL 미기록) |
| Android 기기 / OS | Not run |
| iPhone 기기 / iOS | Not run |
| 시연용 계정 A / B | 이메일 주소 대신 준비 여부만 기록: Not run |

## 사전 조건

- [ ] Cloud Run `/actuator/health`가 정상이고 전시회 동안 최소 인스턴스가 1이다.
- [ ] 두 시연 계정과 비밀번호 복구 수단이 준비되어 있다.
- [ ] EAS preview 환경의 API URL과 Google OAuth Client ID가 현재 운영값이다.
- [ ] EAS Credentials의 FCM V1 키와 `GOOGLE_SERVICES_JSON` sender ID가 일치한다.
- [ ] 백엔드 `EXPO_PUSH_ENABLED=true`이며 DB Flyway V7가 적용됐다.
- [ ] Android preview APK를 설치하고 알림 권한을 허용했다.
- [ ] 네트워크 장애 시 사용할 이메일 로그인 계정을 준비했다.

## Android 내부 APK

| 확인 항목 | 결과 | 메모 |
| --- | --- | --- |
| 앱 설치 및 이메일 로그인 | Not run | |
| Google 로그인 | Not run | |
| 카탈로그 / 물품 상세 | Not run | |
| 양방향 채팅 및 읽음 처리 | Not run | 계정 A/B 사용 |
| 네트워크 단절 후 STOMP 재연결 | Not run | |
| 포그라운드 알림 | Not run | |
| 백그라운드 알림 | Not run | |
| 종료 상태에서 알림 열기 | Not run | |
| 채팅 알림 → 해당 채팅방 | Not run | |
| 대여 알림 → 읽기 전용 대여 정보 | Not run | |
| 토큰 변경 후 재등록 | Not run | 가능 기기/환경에서 확인 |
| 로그아웃 시 토큰 해제 | Not run | 다른 계정에 이전 알림이 오지 않는지 확인 |
| 안전 영역 / 키보드 / 시스템 뒤로가기 | Not run | |

## iPhone Expo Go

iPhone은 핵심 앱 흐름 시연용이다. 이 단계에서는 iOS 원격 푸시,
TestFlight, App Store 배포를 합격 조건으로 두지 않는다.

| 확인 항목 | 결과 | 메모 |
| --- | --- | --- |
| QR 실행 및 Cloud Run 연결 | Not run | 동일 HTTPS API 사용 |
| 이메일 로그인 | Not run | |
| Google 로그인(설정된 경우) | Not run | 실패 시 이메일 계정 사용 |
| 홈 / 탐색 / 물품 상세 | Not run | |
| 채팅 목록 / 양방향 메시지 | Not run | |
| 네트워크 단절 후 재연결 | Not run | |
| 안전 영역 / 키보드 동작 | Not run | |

## 시연 직전 10분

- [ ] Android APK와 iPhone Expo Go를 모두 한 번 재실행한다.
- [ ] 두 계정으로 새 채팅을 한 번 왕복한다.
- [ ] Android 알림을 한 번 보내고 올바른 화면으로 이동하는지 확인한다.
- [ ] Cloud Run과 Cloud SQL 상태, 네트워크를 확인한다.
- [ ] QR, 로그인 계정 준비 여부, 발표 순서를 오프라인 메모로 준비한다.
