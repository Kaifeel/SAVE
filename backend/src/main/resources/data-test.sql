-- 로컬 dev/H2 전용 테스트 데이터. 운영 DB에는 사용하지 마세요.
-- 기존 파일 변경 없이 backend 폴더에서 실행:
-- .\gradlew.bat bootRun --args="--spring.sql.init.data-locations=classpath:data-dev.sql,classpath:data-test.sql"
-- data-dev.sql을 먼저 실행해야 부경대학교와 수령 장소가 준비됩니다.
-- 계정: test01@pukyong.ac.kr ~ test10@pukyong.ac.kr
-- 공통 비밀번호: 12341234 (아래에는 BCrypt 해시만 저장)
-- 모두 가상 사용자이며 실제 이메일 발송에 사용하지 마세요.
-- 사용자당 LEND 게시물 5개, 총 50개. 모두 AVAILABLE. 게시물 ID 1~10에 테스트 사진 연결.
-- 기본키는 자동 생성. 기존 행은 수정하지 않으며 이메일/소유자+제목으로 중복 방지.
-- 테스트 게시물 제목을 변경하면 다음 실행 때 원래 제목의 게시물이 다시 추가됩니다.

INSERT INTO users (university_id, email, name, department, password_hash, oauth_provider, oauth_id, role, status, created_at, updated_at)
SELECT u.id, 'test01@pukyong.ac.kr', '김민준', '컴퓨터공학과', '$2a$10$/2EOu9XFwQHfrP9lPH1u7usGnQSHFRQcYkjr/uzjoWYZK.l0.HuXK', 'LOCAL', 'test01@pukyong.ac.kr', 'USER', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM universities u
WHERE u.name = '부경대학교'
AND NOT EXISTS (SELECT 1 FROM users existing WHERE LOWER(existing.email) = 'test01@pukyong.ac.kr');

INSERT INTO users (university_id, email, name, department, password_hash, oauth_provider, oauth_id, role, status, created_at, updated_at)
SELECT u.id, 'test02@pukyong.ac.kr', '이서연', '경영학부', '$2a$10$/2EOu9XFwQHfrP9lPH1u7usGnQSHFRQcYkjr/uzjoWYZK.l0.HuXK', 'LOCAL', 'test02@pukyong.ac.kr', 'USER', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM universities u
WHERE u.name = '부경대학교'
AND NOT EXISTS (SELECT 1 FROM users existing WHERE LOWER(existing.email) = 'test02@pukyong.ac.kr');

INSERT INTO users (university_id, email, name, department, password_hash, oauth_provider, oauth_id, role, status, created_at, updated_at)
SELECT u.id, 'test03@pukyong.ac.kr', '박지호', '전자공학과', '$2a$10$/2EOu9XFwQHfrP9lPH1u7usGnQSHFRQcYkjr/uzjoWYZK.l0.HuXK', 'LOCAL', 'test03@pukyong.ac.kr', 'USER', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM universities u
WHERE u.name = '부경대학교'
AND NOT EXISTS (SELECT 1 FROM users existing WHERE LOWER(existing.email) = 'test03@pukyong.ac.kr');

INSERT INTO users (university_id, email, name, department, password_hash, oauth_provider, oauth_id, role, status, created_at, updated_at)
SELECT u.id, 'test04@pukyong.ac.kr', '최지우', '시각디자인학과', '$2a$10$/2EOu9XFwQHfrP9lPH1u7usGnQSHFRQcYkjr/uzjoWYZK.l0.HuXK', 'LOCAL', 'test04@pukyong.ac.kr', 'USER', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM universities u
WHERE u.name = '부경대학교'
AND NOT EXISTS (SELECT 1 FROM users existing WHERE LOWER(existing.email) = 'test04@pukyong.ac.kr');

INSERT INTO users (university_id, email, name, department, password_hash, oauth_provider, oauth_id, role, status, created_at, updated_at)
SELECT u.id, 'test05@pukyong.ac.kr', '정도윤', '기계공학과', '$2a$10$/2EOu9XFwQHfrP9lPH1u7usGnQSHFRQcYkjr/uzjoWYZK.l0.HuXK', 'LOCAL', 'test05@pukyong.ac.kr', 'USER', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM universities u
WHERE u.name = '부경대학교'
AND NOT EXISTS (SELECT 1 FROM users existing WHERE LOWER(existing.email) = 'test05@pukyong.ac.kr');

INSERT INTO users (university_id, email, name, department, password_hash, oauth_provider, oauth_id, role, status, created_at, updated_at)
SELECT u.id, 'test06@pukyong.ac.kr', '강하은', '영어영문학부', '$2a$10$/2EOu9XFwQHfrP9lPH1u7usGnQSHFRQcYkjr/uzjoWYZK.l0.HuXK', 'LOCAL', 'test06@pukyong.ac.kr', 'USER', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM universities u
WHERE u.name = '부경대학교'
AND NOT EXISTS (SELECT 1 FROM users existing WHERE LOWER(existing.email) = 'test06@pukyong.ac.kr');

INSERT INTO users (university_id, email, name, department, password_hash, oauth_provider, oauth_id, role, status, created_at, updated_at)
SELECT u.id, 'test07@pukyong.ac.kr', '조현우', '건축학과', '$2a$10$/2EOu9XFwQHfrP9lPH1u7usGnQSHFRQcYkjr/uzjoWYZK.l0.HuXK', 'LOCAL', 'test07@pukyong.ac.kr', 'USER', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM universities u
WHERE u.name = '부경대학교'
AND NOT EXISTS (SELECT 1 FROM users existing WHERE LOWER(existing.email) = 'test07@pukyong.ac.kr');

INSERT INTO users (university_id, email, name, department, password_hash, oauth_provider, oauth_id, role, status, created_at, updated_at)
SELECT u.id, 'test08@pukyong.ac.kr', '윤수빈', '해양공학과', '$2a$10$/2EOu9XFwQHfrP9lPH1u7usGnQSHFRQcYkjr/uzjoWYZK.l0.HuXK', 'LOCAL', 'test08@pukyong.ac.kr', 'USER', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM universities u
WHERE u.name = '부경대학교'
AND NOT EXISTS (SELECT 1 FROM users existing WHERE LOWER(existing.email) = 'test08@pukyong.ac.kr');

INSERT INTO users (university_id, email, name, department, password_hash, oauth_provider, oauth_id, role, status, created_at, updated_at)
SELECT u.id, 'test09@pukyong.ac.kr', '장예준', '통계학과', '$2a$10$/2EOu9XFwQHfrP9lPH1u7usGnQSHFRQcYkjr/uzjoWYZK.l0.HuXK', 'LOCAL', 'test09@pukyong.ac.kr', 'USER', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM universities u
WHERE u.name = '부경대학교'
AND NOT EXISTS (SELECT 1 FROM users existing WHERE LOWER(existing.email) = 'test09@pukyong.ac.kr');

INSERT INTO users (university_id, email, name, department, password_hash, oauth_provider, oauth_id, role, status, created_at, updated_at)
SELECT u.id, 'test10@pukyong.ac.kr', '임채원', '식품영양학과', '$2a$10$/2EOu9XFwQHfrP9lPH1u7usGnQSHFRQcYkjr/uzjoWYZK.l0.HuXK', 'LOCAL', 'test10@pukyong.ac.kr', 'USER', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM universities u
WHERE u.name = '부경대학교'
AND NOT EXISTS (SELECT 1 FROM users existing WHERE LOWER(existing.email) = 'test10@pukyong.ac.kr');

INSERT INTO items (owner_id, pickup_location_id, type, title, rental_fee, rental_unit, description, precautions, status, view_count, created_at, updated_at)
SELECT u.id, p.id, 'LEND', '아이패드와 애플펜슬', 1000, 'DAY',
'아이패드와 애플펜슬 대여합니다. 수령 시간은 채팅으로 정해요.',
'반납 시간을 지켜 주세요. 사용 후 깨끗하게 정리하고 분실이나 파손 시 채팅으로 알려 주세요.',
'AVAILABLE', 0, DATEADD('HOUR', -0, CURRENT_TIMESTAMP), DATEADD('HOUR', -0, CURRENT_TIMESTAMP)
FROM users u JOIN pickup_locations p ON p.university_id = u.university_id
WHERE u.email = 'test01@pukyong.ac.kr' AND u.oauth_provider = 'LOCAL' AND u.oauth_id = 'test01@pukyong.ac.kr' AND p.name = '청운관'
AND NOT EXISTS (SELECT 1 FROM items existing WHERE existing.owner_id = u.id AND existing.title = '아이패드와 애플펜슬');

INSERT INTO items (owner_id, pickup_location_id, type, title, rental_fee, rental_unit, description, precautions, status, view_count, created_at, updated_at)
SELECT u.id, p.id, 'LEND', '접이식 노트북 거치대', 2000, 'DAY',
'접이식 노트북 거치대 대여합니다. 수령 시간은 채팅으로 정해요.',
'반납 시간을 지켜 주세요. 사용 후 깨끗하게 정리하고 분실이나 파손 시 채팅으로 알려 주세요.',
'AVAILABLE', 0, DATEADD('HOUR', -1, CURRENT_TIMESTAMP), DATEADD('HOUR', -1, CURRENT_TIMESTAMP)
FROM users u JOIN pickup_locations p ON p.university_id = u.university_id
WHERE u.email = 'test01@pukyong.ac.kr' AND u.oauth_provider = 'LOCAL' AND u.oauth_id = 'test01@pukyong.ac.kr' AND p.name = '중앙도서관'
AND NOT EXISTS (SELECT 1 FROM items existing WHERE existing.owner_id = u.id AND existing.title = '접이식 노트북 거치대');

INSERT INTO items (owner_id, pickup_location_id, type, title, rental_fee, rental_unit, description, precautions, status, view_count, created_at, updated_at)
SELECT u.id, p.id, 'LEND', '무선 키보드', 3000, 'DAY',
'무선 키보드 대여합니다. 수령 시간은 채팅으로 정해요.',
'반납 시간을 지켜 주세요. 사용 후 깨끗하게 정리하고 분실이나 파손 시 채팅으로 알려 주세요.',
'AVAILABLE', 0, DATEADD('HOUR', -2, CURRENT_TIMESTAMP), DATEADD('HOUR', -2, CURRENT_TIMESTAMP)
FROM users u JOIN pickup_locations p ON p.university_id = u.university_id
WHERE u.email = 'test01@pukyong.ac.kr' AND u.oauth_provider = 'LOCAL' AND u.oauth_id = 'test01@pukyong.ac.kr' AND p.name = '누리관'
AND NOT EXISTS (SELECT 1 FROM items existing WHERE existing.owner_id = u.id AND existing.title = '무선 키보드');

INSERT INTO items (owner_id, pickup_location_id, type, title, rental_fee, rental_unit, description, precautions, status, view_count, created_at, updated_at)
SELECT u.id, p.id, 'LEND', '무선 마우스', 5000, 'DAY',
'무선 마우스 대여합니다. 수령 시간은 채팅으로 정해요.',
'반납 시간을 지켜 주세요. 사용 후 깨끗하게 정리하고 분실이나 파손 시 채팅으로 알려 주세요.',
'AVAILABLE', 0, DATEADD('HOUR', -3, CURRENT_TIMESTAMP), DATEADD('HOUR', -3, CURRENT_TIMESTAMP)
FROM users u JOIN pickup_locations p ON p.university_id = u.university_id
WHERE u.email = 'test01@pukyong.ac.kr' AND u.oauth_provider = 'LOCAL' AND u.oauth_id = 'test01@pukyong.ac.kr' AND p.name = '청운관'
AND NOT EXISTS (SELECT 1 FROM items existing WHERE existing.owner_id = u.id AND existing.title = '무선 마우스');

INSERT INTO items (owner_id, pickup_location_id, type, title, rental_fee, rental_unit, description, precautions, status, view_count, created_at, updated_at)
SELECT u.id, p.id, 'LEND', 'USB-C 멀티 허브', 0, 'DAY',
'USB-C 멀티 허브 대여합니다. 수령 시간은 채팅으로 정해요.',
'반납 시간을 지켜 주세요. 사용 후 깨끗하게 정리하고 분실이나 파손 시 채팅으로 알려 주세요.',
'AVAILABLE', 0, DATEADD('HOUR', -4, CURRENT_TIMESTAMP), DATEADD('HOUR', -4, CURRENT_TIMESTAMP)
FROM users u JOIN pickup_locations p ON p.university_id = u.university_id
WHERE u.email = 'test01@pukyong.ac.kr' AND u.oauth_provider = 'LOCAL' AND u.oauth_id = 'test01@pukyong.ac.kr' AND p.name = '중앙도서관'
AND NOT EXISTS (SELECT 1 FROM items existing WHERE existing.owner_id = u.id AND existing.title = 'USB-C 멀티 허브');

INSERT INTO items (owner_id, pickup_location_id, type, title, rental_fee, rental_unit, description, precautions, status, view_count, created_at, updated_at)
SELECT u.id, p.id, 'LEND', '경영학원론 교재', 1000, 'DAY',
'경영학원론 교재 대여합니다. 수령 시간은 채팅으로 정해요.',
'반납 시간을 지켜 주세요. 사용 후 깨끗하게 정리하고 분실이나 파손 시 채팅으로 알려 주세요.',
'AVAILABLE', 0, DATEADD('HOUR', -5, CURRENT_TIMESTAMP), DATEADD('HOUR', -5, CURRENT_TIMESTAMP)
FROM users u JOIN pickup_locations p ON p.university_id = u.university_id
WHERE u.email = 'test02@pukyong.ac.kr' AND u.oauth_provider = 'LOCAL' AND u.oauth_id = 'test02@pukyong.ac.kr' AND p.name = '누리관'
AND NOT EXISTS (SELECT 1 FROM items existing WHERE existing.owner_id = u.id AND existing.title = '경영학원론 교재');

INSERT INTO items (owner_id, pickup_location_id, type, title, rental_fee, rental_unit, description, precautions, status, view_count, created_at, updated_at)
SELECT u.id, p.id, 'LEND', '공학용 계산기', 2000, 'DAY',
'공학용 계산기 대여합니다. 수령 시간은 채팅으로 정해요.',
'반납 시간을 지켜 주세요. 사용 후 깨끗하게 정리하고 분실이나 파손 시 채팅으로 알려 주세요.',
'AVAILABLE', 0, DATEADD('HOUR', -6, CURRENT_TIMESTAMP), DATEADD('HOUR', -6, CURRENT_TIMESTAMP)
FROM users u JOIN pickup_locations p ON p.university_id = u.university_id
WHERE u.email = 'test02@pukyong.ac.kr' AND u.oauth_provider = 'LOCAL' AND u.oauth_id = 'test02@pukyong.ac.kr' AND p.name = '청운관'
AND NOT EXISTS (SELECT 1 FROM items existing WHERE existing.owner_id = u.id AND existing.title = '공학용 계산기');

INSERT INTO items (owner_id, pickup_location_id, type, title, rental_fee, rental_unit, description, precautions, status, view_count, created_at, updated_at)
SELECT u.id, p.id, 'LEND', '발표용 무선 포인터', 3000, 'DAY',
'발표용 무선 포인터 대여합니다. 수령 시간은 채팅으로 정해요.',
'반납 시간을 지켜 주세요. 사용 후 깨끗하게 정리하고 분실이나 파손 시 채팅으로 알려 주세요.',
'AVAILABLE', 0, DATEADD('HOUR', -7, CURRENT_TIMESTAMP), DATEADD('HOUR', -7, CURRENT_TIMESTAMP)
FROM users u JOIN pickup_locations p ON p.university_id = u.university_id
WHERE u.email = 'test02@pukyong.ac.kr' AND u.oauth_provider = 'LOCAL' AND u.oauth_id = 'test02@pukyong.ac.kr' AND p.name = '중앙도서관'
AND NOT EXISTS (SELECT 1 FROM items existing WHERE existing.owner_id = u.id AND existing.title = '발표용 무선 포인터');

INSERT INTO items (owner_id, pickup_location_id, type, title, rental_fee, rental_unit, description, precautions, status, view_count, created_at, updated_at)
SELECT u.id, p.id, 'LEND', '화이트보드', 5000, 'DAY',
'화이트보드 대여합니다. 수령 시간은 채팅으로 정해요.',
'반납 시간을 지켜 주세요. 사용 후 깨끗하게 정리하고 분실이나 파손 시 채팅으로 알려 주세요.',
'AVAILABLE', 0, DATEADD('HOUR', -8, CURRENT_TIMESTAMP), DATEADD('HOUR', -8, CURRENT_TIMESTAMP)
FROM users u JOIN pickup_locations p ON p.university_id = u.university_id
WHERE u.email = 'test02@pukyong.ac.kr' AND u.oauth_provider = 'LOCAL' AND u.oauth_id = 'test02@pukyong.ac.kr' AND p.name = '누리관'
AND NOT EXISTS (SELECT 1 FROM items existing WHERE existing.owner_id = u.id AND existing.title = '화이트보드');

INSERT INTO items (owner_id, pickup_location_id, type, title, rental_fee, rental_unit, description, precautions, status, view_count, created_at, updated_at)
SELECT u.id, p.id, 'LEND', '독서대', 0, 'DAY',
'독서대 대여합니다. 수령 시간은 채팅으로 정해요.',
'반납 시간을 지켜 주세요. 사용 후 깨끗하게 정리하고 분실이나 파손 시 채팅으로 알려 주세요.',
'AVAILABLE', 0, DATEADD('HOUR', -9, CURRENT_TIMESTAMP), DATEADD('HOUR', -9, CURRENT_TIMESTAMP)
FROM users u JOIN pickup_locations p ON p.university_id = u.university_id
WHERE u.email = 'test02@pukyong.ac.kr' AND u.oauth_provider = 'LOCAL' AND u.oauth_id = 'test02@pukyong.ac.kr' AND p.name = '청운관'
AND NOT EXISTS (SELECT 1 FROM items existing WHERE existing.owner_id = u.id AND existing.title = '독서대');

INSERT INTO items (owner_id, pickup_location_id, type, title, rental_fee, rental_unit, description, precautions, status, view_count, created_at, updated_at)
SELECT u.id, p.id, 'LEND', '아두이노 입문 키트', 1000, 'DAY',
'아두이노 입문 키트 대여합니다. 수령 시간은 채팅으로 정해요.',
'반납 시간을 지켜 주세요. 사용 후 깨끗하게 정리하고 분실이나 파손 시 채팅으로 알려 주세요.',
'AVAILABLE', 0, DATEADD('HOUR', -10, CURRENT_TIMESTAMP), DATEADD('HOUR', -10, CURRENT_TIMESTAMP)
FROM users u JOIN pickup_locations p ON p.university_id = u.university_id
WHERE u.email = 'test03@pukyong.ac.kr' AND u.oauth_provider = 'LOCAL' AND u.oauth_id = 'test03@pukyong.ac.kr' AND p.name = '중앙도서관'
AND NOT EXISTS (SELECT 1 FROM items existing WHERE existing.owner_id = u.id AND existing.title = '아두이노 입문 키트');

INSERT INTO items (owner_id, pickup_location_id, type, title, rental_fee, rental_unit, description, precautions, status, view_count, created_at, updated_at)
SELECT u.id, p.id, 'LEND', '디지털 멀티미터', 2000, 'DAY',
'디지털 멀티미터 대여합니다. 수령 시간은 채팅으로 정해요.',
'반납 시간을 지켜 주세요. 사용 후 깨끗하게 정리하고 분실이나 파손 시 채팅으로 알려 주세요.',
'AVAILABLE', 0, DATEADD('HOUR', -11, CURRENT_TIMESTAMP), DATEADD('HOUR', -11, CURRENT_TIMESTAMP)
FROM users u JOIN pickup_locations p ON p.university_id = u.university_id
WHERE u.email = 'test03@pukyong.ac.kr' AND u.oauth_provider = 'LOCAL' AND u.oauth_id = 'test03@pukyong.ac.kr' AND p.name = '누리관'
AND NOT EXISTS (SELECT 1 FROM items existing WHERE existing.owner_id = u.id AND existing.title = '디지털 멀티미터');

INSERT INTO items (owner_id, pickup_location_id, type, title, rental_fee, rental_unit, description, precautions, status, view_count, created_at, updated_at)
SELECT u.id, p.id, 'LEND', '납땜 인두 세트', 3000, 'DAY',
'납땜 인두 세트 대여합니다. 수령 시간은 채팅으로 정해요.',
'반납 시간을 지켜 주세요. 사용 후 깨끗하게 정리하고 분실이나 파손 시 채팅으로 알려 주세요.',
'AVAILABLE', 0, DATEADD('HOUR', -12, CURRENT_TIMESTAMP), DATEADD('HOUR', -12, CURRENT_TIMESTAMP)
FROM users u JOIN pickup_locations p ON p.university_id = u.university_id
WHERE u.email = 'test03@pukyong.ac.kr' AND u.oauth_provider = 'LOCAL' AND u.oauth_id = 'test03@pukyong.ac.kr' AND p.name = '청운관'
AND NOT EXISTS (SELECT 1 FROM items existing WHERE existing.owner_id = u.id AND existing.title = '납땜 인두 세트');

INSERT INTO items (owner_id, pickup_location_id, type, title, rental_fee, rental_unit, description, precautions, status, view_count, created_at, updated_at)
SELECT u.id, p.id, 'LEND', '라즈베리파이 실습 키트', 5000, 'DAY',
'라즈베리파이 실습 키트 대여합니다. 수령 시간은 채팅으로 정해요.',
'반납 시간을 지켜 주세요. 사용 후 깨끗하게 정리하고 분실이나 파손 시 채팅으로 알려 주세요.',
'AVAILABLE', 0, DATEADD('HOUR', -13, CURRENT_TIMESTAMP), DATEADD('HOUR', -13, CURRENT_TIMESTAMP)
FROM users u JOIN pickup_locations p ON p.university_id = u.university_id
WHERE u.email = 'test03@pukyong.ac.kr' AND u.oauth_provider = 'LOCAL' AND u.oauth_id = 'test03@pukyong.ac.kr' AND p.name = '중앙도서관'
AND NOT EXISTS (SELECT 1 FROM items existing WHERE existing.owner_id = u.id AND existing.title = '라즈베리파이 실습 키트');

INSERT INTO items (owner_id, pickup_location_id, type, title, rental_fee, rental_unit, description, precautions, status, view_count, created_at, updated_at)
SELECT u.id, p.id, 'LEND', '전자회로 교재', 0, 'DAY',
'전자회로 교재 대여합니다. 수령 시간은 채팅으로 정해요.',
'반납 시간을 지켜 주세요. 사용 후 깨끗하게 정리하고 분실이나 파손 시 채팅으로 알려 주세요.',
'AVAILABLE', 0, DATEADD('HOUR', -14, CURRENT_TIMESTAMP), DATEADD('HOUR', -14, CURRENT_TIMESTAMP)
FROM users u JOIN pickup_locations p ON p.university_id = u.university_id
WHERE u.email = 'test03@pukyong.ac.kr' AND u.oauth_provider = 'LOCAL' AND u.oauth_id = 'test03@pukyong.ac.kr' AND p.name = '누리관'
AND NOT EXISTS (SELECT 1 FROM items existing WHERE existing.owner_id = u.id AND existing.title = '전자회로 교재');

INSERT INTO items (owner_id, pickup_location_id, type, title, rental_fee, rental_unit, description, precautions, status, view_count, created_at, updated_at)
SELECT u.id, p.id, 'LEND', '미러리스 카메라', 1000, 'DAY',
'미러리스 카메라 대여합니다. 수령 시간은 채팅으로 정해요.',
'반납 시간을 지켜 주세요. 사용 후 깨끗하게 정리하고 분실이나 파손 시 채팅으로 알려 주세요.',
'AVAILABLE', 0, DATEADD('HOUR', -15, CURRENT_TIMESTAMP), DATEADD('HOUR', -15, CURRENT_TIMESTAMP)
FROM users u JOIN pickup_locations p ON p.university_id = u.university_id
WHERE u.email = 'test04@pukyong.ac.kr' AND u.oauth_provider = 'LOCAL' AND u.oauth_id = 'test04@pukyong.ac.kr' AND p.name = '청운관'
AND NOT EXISTS (SELECT 1 FROM items existing WHERE existing.owner_id = u.id AND existing.title = '미러리스 카메라');

INSERT INTO items (owner_id, pickup_location_id, type, title, rental_fee, rental_unit, description, precautions, status, view_count, created_at, updated_at)
SELECT u.id, p.id, 'LEND', '카메라 삼각대', 2000, 'DAY',
'카메라 삼각대 대여합니다. 수령 시간은 채팅으로 정해요.',
'반납 시간을 지켜 주세요. 사용 후 깨끗하게 정리하고 분실이나 파손 시 채팅으로 알려 주세요.',
'AVAILABLE', 0, DATEADD('HOUR', -16, CURRENT_TIMESTAMP), DATEADD('HOUR', -16, CURRENT_TIMESTAMP)
FROM users u JOIN pickup_locations p ON p.university_id = u.university_id
WHERE u.email = 'test04@pukyong.ac.kr' AND u.oauth_provider = 'LOCAL' AND u.oauth_id = 'test04@pukyong.ac.kr' AND p.name = '중앙도서관'
AND NOT EXISTS (SELECT 1 FROM items existing WHERE existing.owner_id = u.id AND existing.title = '카메라 삼각대');

INSERT INTO items (owner_id, pickup_location_id, type, title, rental_fee, rental_unit, description, precautions, status, view_count, created_at, updated_at)
SELECT u.id, p.id, 'LEND', 'LED 촬영 조명', 3000, 'DAY',
'LED 촬영 조명 대여합니다. 수령 시간은 채팅으로 정해요.',
'반납 시간을 지켜 주세요. 사용 후 깨끗하게 정리하고 분실이나 파손 시 채팅으로 알려 주세요.',
'AVAILABLE', 0, DATEADD('HOUR', -17, CURRENT_TIMESTAMP), DATEADD('HOUR', -17, CURRENT_TIMESTAMP)
FROM users u JOIN pickup_locations p ON p.university_id = u.university_id
WHERE u.email = 'test04@pukyong.ac.kr' AND u.oauth_provider = 'LOCAL' AND u.oauth_id = 'test04@pukyong.ac.kr' AND p.name = '누리관'
AND NOT EXISTS (SELECT 1 FROM items existing WHERE existing.owner_id = u.id AND existing.title = 'LED 촬영 조명');

INSERT INTO items (owner_id, pickup_location_id, type, title, rental_fee, rental_unit, description, precautions, status, view_count, created_at, updated_at)
SELECT u.id, p.id, 'LEND', '펜 타블렛', 5000, 'DAY',
'펜 타블렛 대여합니다. 수령 시간은 채팅으로 정해요.',
'반납 시간을 지켜 주세요. 사용 후 깨끗하게 정리하고 분실이나 파손 시 채팅으로 알려 주세요.',
'AVAILABLE', 0, DATEADD('HOUR', -18, CURRENT_TIMESTAMP), DATEADD('HOUR', -18, CURRENT_TIMESTAMP)
FROM users u JOIN pickup_locations p ON p.university_id = u.university_id
WHERE u.email = 'test04@pukyong.ac.kr' AND u.oauth_provider = 'LOCAL' AND u.oauth_id = 'test04@pukyong.ac.kr' AND p.name = '청운관'
AND NOT EXISTS (SELECT 1 FROM items existing WHERE existing.owner_id = u.id AND existing.title = '펜 타블렛');

INSERT INTO items (owner_id, pickup_location_id, type, title, rental_fee, rental_unit, description, precautions, status, view_count, created_at, updated_at)
SELECT u.id, p.id, 'LEND', '촬영용 반사판', 0, 'DAY',
'촬영용 반사판 대여합니다. 수령 시간은 채팅으로 정해요.',
'반납 시간을 지켜 주세요. 사용 후 깨끗하게 정리하고 분실이나 파손 시 채팅으로 알려 주세요.',
'AVAILABLE', 0, DATEADD('HOUR', -19, CURRENT_TIMESTAMP), DATEADD('HOUR', -19, CURRENT_TIMESTAMP)
FROM users u JOIN pickup_locations p ON p.university_id = u.university_id
WHERE u.email = 'test04@pukyong.ac.kr' AND u.oauth_provider = 'LOCAL' AND u.oauth_id = 'test04@pukyong.ac.kr' AND p.name = '중앙도서관'
AND NOT EXISTS (SELECT 1 FROM items existing WHERE existing.owner_id = u.id AND existing.title = '촬영용 반사판');

INSERT INTO items (owner_id, pickup_location_id, type, title, rental_fee, rental_unit, description, precautions, status, view_count, created_at, updated_at)
SELECT u.id, p.id, 'LEND', '전동 드릴', 1000, 'DAY',
'전동 드릴 대여합니다. 수령 시간은 채팅으로 정해요.',
'반납 시간을 지켜 주세요. 사용 후 깨끗하게 정리하고 분실이나 파손 시 채팅으로 알려 주세요.',
'AVAILABLE', 0, DATEADD('HOUR', -20, CURRENT_TIMESTAMP), DATEADD('HOUR', -20, CURRENT_TIMESTAMP)
FROM users u JOIN pickup_locations p ON p.university_id = u.university_id
WHERE u.email = 'test05@pukyong.ac.kr' AND u.oauth_provider = 'LOCAL' AND u.oauth_id = 'test05@pukyong.ac.kr' AND p.name = '누리관'
AND NOT EXISTS (SELECT 1 FROM items existing WHERE existing.owner_id = u.id AND existing.title = '전동 드릴');

INSERT INTO items (owner_id, pickup_location_id, type, title, rental_fee, rental_unit, description, precautions, status, view_count, created_at, updated_at)
SELECT u.id, p.id, 'LEND', '정밀 드라이버 세트', 2000, 'DAY',
'정밀 드라이버 세트 대여합니다. 수령 시간은 채팅으로 정해요.',
'반납 시간을 지켜 주세요. 사용 후 깨끗하게 정리하고 분실이나 파손 시 채팅으로 알려 주세요.',
'AVAILABLE', 0, DATEADD('HOUR', -21, CURRENT_TIMESTAMP), DATEADD('HOUR', -21, CURRENT_TIMESTAMP)
FROM users u JOIN pickup_locations p ON p.university_id = u.university_id
WHERE u.email = 'test05@pukyong.ac.kr' AND u.oauth_provider = 'LOCAL' AND u.oauth_id = 'test05@pukyong.ac.kr' AND p.name = '청운관'
AND NOT EXISTS (SELECT 1 FROM items existing WHERE existing.owner_id = u.id AND existing.title = '정밀 드라이버 세트');

INSERT INTO items (owner_id, pickup_location_id, type, title, rental_fee, rental_unit, description, precautions, status, view_count, created_at, updated_at)
SELECT u.id, p.id, 'LEND', '육각 렌치 세트', 3000, 'DAY',
'육각 렌치 세트 대여합니다. 수령 시간은 채팅으로 정해요.',
'반납 시간을 지켜 주세요. 사용 후 깨끗하게 정리하고 분실이나 파손 시 채팅으로 알려 주세요.',
'AVAILABLE', 0, DATEADD('HOUR', -22, CURRENT_TIMESTAMP), DATEADD('HOUR', -22, CURRENT_TIMESTAMP)
FROM users u JOIN pickup_locations p ON p.university_id = u.university_id
WHERE u.email = 'test05@pukyong.ac.kr' AND u.oauth_provider = 'LOCAL' AND u.oauth_id = 'test05@pukyong.ac.kr' AND p.name = '중앙도서관'
AND NOT EXISTS (SELECT 1 FROM items existing WHERE existing.owner_id = u.id AND existing.title = '육각 렌치 세트');

INSERT INTO items (owner_id, pickup_location_id, type, title, rental_fee, rental_unit, description, precautions, status, view_count, created_at, updated_at)
SELECT u.id, p.id, 'LEND', '줄자', 5000, 'DAY',
'줄자 대여합니다. 수령 시간은 채팅으로 정해요.',
'반납 시간을 지켜 주세요. 사용 후 깨끗하게 정리하고 분실이나 파손 시 채팅으로 알려 주세요.',
'AVAILABLE', 0, DATEADD('HOUR', -23, CURRENT_TIMESTAMP), DATEADD('HOUR', -23, CURRENT_TIMESTAMP)
FROM users u JOIN pickup_locations p ON p.university_id = u.university_id
WHERE u.email = 'test05@pukyong.ac.kr' AND u.oauth_provider = 'LOCAL' AND u.oauth_id = 'test05@pukyong.ac.kr' AND p.name = '누리관'
AND NOT EXISTS (SELECT 1 FROM items existing WHERE existing.owner_id = u.id AND existing.title = '줄자');

INSERT INTO items (owner_id, pickup_location_id, type, title, rental_fee, rental_unit, description, precautions, status, view_count, created_at, updated_at)
SELECT u.id, p.id, 'LEND', '보안경', 0, 'DAY',
'보안경 대여합니다. 수령 시간은 채팅으로 정해요.',
'반납 시간을 지켜 주세요. 사용 후 깨끗하게 정리하고 분실이나 파손 시 채팅으로 알려 주세요.',
'AVAILABLE', 0, DATEADD('HOUR', -24, CURRENT_TIMESTAMP), DATEADD('HOUR', -24, CURRENT_TIMESTAMP)
FROM users u JOIN pickup_locations p ON p.university_id = u.university_id
WHERE u.email = 'test05@pukyong.ac.kr' AND u.oauth_provider = 'LOCAL' AND u.oauth_id = 'test05@pukyong.ac.kr' AND p.name = '청운관'
AND NOT EXISTS (SELECT 1 FROM items existing WHERE existing.owner_id = u.id AND existing.title = '보안경');

INSERT INTO items (owner_id, pickup_location_id, type, title, rental_fee, rental_unit, description, precautions, status, view_count, created_at, updated_at)
SELECT u.id, p.id, 'LEND', '토익 문제집', 1000, 'DAY',
'토익 문제집 대여합니다. 수령 시간은 채팅으로 정해요.',
'반납 시간을 지켜 주세요. 사용 후 깨끗하게 정리하고 분실이나 파손 시 채팅으로 알려 주세요.',
'AVAILABLE', 0, DATEADD('HOUR', -25, CURRENT_TIMESTAMP), DATEADD('HOUR', -25, CURRENT_TIMESTAMP)
FROM users u JOIN pickup_locations p ON p.university_id = u.university_id
WHERE u.email = 'test06@pukyong.ac.kr' AND u.oauth_provider = 'LOCAL' AND u.oauth_id = 'test06@pukyong.ac.kr' AND p.name = '중앙도서관'
AND NOT EXISTS (SELECT 1 FROM items existing WHERE existing.owner_id = u.id AND existing.title = '토익 문제집');

INSERT INTO items (owner_id, pickup_location_id, type, title, rental_fee, rental_unit, description, precautions, status, view_count, created_at, updated_at)
SELECT u.id, p.id, 'LEND', '휴대용 녹음기', 2000, 'DAY',
'휴대용 녹음기 대여합니다. 수령 시간은 채팅으로 정해요.',
'반납 시간을 지켜 주세요. 사용 후 깨끗하게 정리하고 분실이나 파손 시 채팅으로 알려 주세요.',
'AVAILABLE', 0, DATEADD('HOUR', -26, CURRENT_TIMESTAMP), DATEADD('HOUR', -26, CURRENT_TIMESTAMP)
FROM users u JOIN pickup_locations p ON p.university_id = u.university_id
WHERE u.email = 'test06@pukyong.ac.kr' AND u.oauth_provider = 'LOCAL' AND u.oauth_id = 'test06@pukyong.ac.kr' AND p.name = '누리관'
AND NOT EXISTS (SELECT 1 FROM items existing WHERE existing.owner_id = u.id AND existing.title = '휴대용 녹음기');

INSERT INTO items (owner_id, pickup_location_id, type, title, rental_fee, rental_unit, description, precautions, status, view_count, created_at, updated_at)
SELECT u.id, p.id, 'LEND', '블루투스 스피커', 3000, 'DAY',
'블루투스 스피커 대여합니다. 수령 시간은 채팅으로 정해요.',
'반납 시간을 지켜 주세요. 사용 후 깨끗하게 정리하고 분실이나 파손 시 채팅으로 알려 주세요.',
'AVAILABLE', 0, DATEADD('HOUR', -27, CURRENT_TIMESTAMP), DATEADD('HOUR', -27, CURRENT_TIMESTAMP)
FROM users u JOIN pickup_locations p ON p.university_id = u.university_id
WHERE u.email = 'test06@pukyong.ac.kr' AND u.oauth_provider = 'LOCAL' AND u.oauth_id = 'test06@pukyong.ac.kr' AND p.name = '청운관'
AND NOT EXISTS (SELECT 1 FROM items existing WHERE existing.owner_id = u.id AND existing.title = '블루투스 스피커');

INSERT INTO items (owner_id, pickup_location_id, type, title, rental_fee, rental_unit, description, precautions, status, view_count, created_at, updated_at)
SELECT u.id, p.id, 'LEND', '노이즈 캔슬링 헤드폰', 5000, 'DAY',
'노이즈 캔슬링 헤드폰 대여합니다. 수령 시간은 채팅으로 정해요.',
'반납 시간을 지켜 주세요. 사용 후 깨끗하게 정리하고 분실이나 파손 시 채팅으로 알려 주세요.',
'AVAILABLE', 0, DATEADD('HOUR', -28, CURRENT_TIMESTAMP), DATEADD('HOUR', -28, CURRENT_TIMESTAMP)
FROM users u JOIN pickup_locations p ON p.university_id = u.university_id
WHERE u.email = 'test06@pukyong.ac.kr' AND u.oauth_provider = 'LOCAL' AND u.oauth_id = 'test06@pukyong.ac.kr' AND p.name = '중앙도서관'
AND NOT EXISTS (SELECT 1 FROM items existing WHERE existing.owner_id = u.id AND existing.title = '노이즈 캔슬링 헤드폰');

INSERT INTO items (owner_id, pickup_location_id, type, title, rental_fee, rental_unit, description, precautions, status, view_count, created_at, updated_at)
SELECT u.id, p.id, 'LEND', '전자책 리더기', 0, 'DAY',
'전자책 리더기 대여합니다. 수령 시간은 채팅으로 정해요.',
'반납 시간을 지켜 주세요. 사용 후 깨끗하게 정리하고 분실이나 파손 시 채팅으로 알려 주세요.',
'AVAILABLE', 0, DATEADD('HOUR', -29, CURRENT_TIMESTAMP), DATEADD('HOUR', -29, CURRENT_TIMESTAMP)
FROM users u JOIN pickup_locations p ON p.university_id = u.university_id
WHERE u.email = 'test06@pukyong.ac.kr' AND u.oauth_provider = 'LOCAL' AND u.oauth_id = 'test06@pukyong.ac.kr' AND p.name = '누리관'
AND NOT EXISTS (SELECT 1 FROM items existing WHERE existing.owner_id = u.id AND existing.title = '전자책 리더기');

INSERT INTO items (owner_id, pickup_location_id, type, title, rental_fee, rental_unit, description, precautions, status, view_count, created_at, updated_at)
SELECT u.id, p.id, 'LEND', '건축 제도판', 1000, 'DAY',
'건축 제도판 대여합니다. 수령 시간은 채팅으로 정해요.',
'반납 시간을 지켜 주세요. 사용 후 깨끗하게 정리하고 분실이나 파손 시 채팅으로 알려 주세요.',
'AVAILABLE', 0, DATEADD('HOUR', -30, CURRENT_TIMESTAMP), DATEADD('HOUR', -30, CURRENT_TIMESTAMP)
FROM users u JOIN pickup_locations p ON p.university_id = u.university_id
WHERE u.email = 'test07@pukyong.ac.kr' AND u.oauth_provider = 'LOCAL' AND u.oauth_id = 'test07@pukyong.ac.kr' AND p.name = '청운관'
AND NOT EXISTS (SELECT 1 FROM items existing WHERE existing.owner_id = u.id AND existing.title = '건축 제도판');

INSERT INTO items (owner_id, pickup_location_id, type, title, rental_fee, rental_unit, description, precautions, status, view_count, created_at, updated_at)
SELECT u.id, p.id, 'LEND', '모형 제작 도구', 2000, 'DAY',
'모형 제작 도구 대여합니다. 수령 시간은 채팅으로 정해요.',
'반납 시간을 지켜 주세요. 사용 후 깨끗하게 정리하고 분실이나 파손 시 채팅으로 알려 주세요.',
'AVAILABLE', 0, DATEADD('HOUR', -31, CURRENT_TIMESTAMP), DATEADD('HOUR', -31, CURRENT_TIMESTAMP)
FROM users u JOIN pickup_locations p ON p.university_id = u.university_id
WHERE u.email = 'test07@pukyong.ac.kr' AND u.oauth_provider = 'LOCAL' AND u.oauth_id = 'test07@pukyong.ac.kr' AND p.name = '중앙도서관'
AND NOT EXISTS (SELECT 1 FROM items existing WHERE existing.owner_id = u.id AND existing.title = '모형 제작 도구');

INSERT INTO items (owner_id, pickup_location_id, type, title, rental_fee, rental_unit, description, precautions, status, view_count, created_at, updated_at)
SELECT u.id, p.id, 'LEND', 'A3 커팅 매트', 3000, 'DAY',
'A3 커팅 매트 대여합니다. 수령 시간은 채팅으로 정해요.',
'반납 시간을 지켜 주세요. 사용 후 깨끗하게 정리하고 분실이나 파손 시 채팅으로 알려 주세요.',
'AVAILABLE', 0, DATEADD('HOUR', -32, CURRENT_TIMESTAMP), DATEADD('HOUR', -32, CURRENT_TIMESTAMP)
FROM users u JOIN pickup_locations p ON p.university_id = u.university_id
WHERE u.email = 'test07@pukyong.ac.kr' AND u.oauth_provider = 'LOCAL' AND u.oauth_id = 'test07@pukyong.ac.kr' AND p.name = '누리관'
AND NOT EXISTS (SELECT 1 FROM items existing WHERE existing.owner_id = u.id AND existing.title = 'A3 커팅 매트');

INSERT INTO items (owner_id, pickup_location_id, type, title, rental_fee, rental_unit, description, precautions, status, view_count, created_at, updated_at)
SELECT u.id, p.id, 'LEND', '레이저 거리측정기', 5000, 'DAY',
'레이저 거리측정기 대여합니다. 수령 시간은 채팅으로 정해요.',
'반납 시간을 지켜 주세요. 사용 후 깨끗하게 정리하고 분실이나 파손 시 채팅으로 알려 주세요.',
'AVAILABLE', 0, DATEADD('HOUR', -33, CURRENT_TIMESTAMP), DATEADD('HOUR', -33, CURRENT_TIMESTAMP)
FROM users u JOIN pickup_locations p ON p.university_id = u.university_id
WHERE u.email = 'test07@pukyong.ac.kr' AND u.oauth_provider = 'LOCAL' AND u.oauth_id = 'test07@pukyong.ac.kr' AND p.name = '청운관'
AND NOT EXISTS (SELECT 1 FROM items existing WHERE existing.owner_id = u.id AND existing.title = '레이저 거리측정기');

INSERT INTO items (owner_id, pickup_location_id, type, title, rental_fee, rental_unit, description, precautions, status, view_count, created_at, updated_at)
SELECT u.id, p.id, 'LEND', '스케일 자', 0, 'DAY',
'스케일 자 대여합니다. 수령 시간은 채팅으로 정해요.',
'반납 시간을 지켜 주세요. 사용 후 깨끗하게 정리하고 분실이나 파손 시 채팅으로 알려 주세요.',
'AVAILABLE', 0, DATEADD('HOUR', -34, CURRENT_TIMESTAMP), DATEADD('HOUR', -34, CURRENT_TIMESTAMP)
FROM users u JOIN pickup_locations p ON p.university_id = u.university_id
WHERE u.email = 'test07@pukyong.ac.kr' AND u.oauth_provider = 'LOCAL' AND u.oauth_id = 'test07@pukyong.ac.kr' AND p.name = '중앙도서관'
AND NOT EXISTS (SELECT 1 FROM items existing WHERE existing.owner_id = u.id AND existing.title = '스케일 자');

INSERT INTO items (owner_id, pickup_location_id, type, title, rental_fee, rental_unit, description, precautions, status, view_count, created_at, updated_at)
SELECT u.id, p.id, 'LEND', '2인용 텐트', 1000, 'DAY',
'2인용 텐트 대여합니다. 수령 시간은 채팅으로 정해요.',
'반납 시간을 지켜 주세요. 사용 후 깨끗하게 정리하고 분실이나 파손 시 채팅으로 알려 주세요.',
'AVAILABLE', 0, DATEADD('HOUR', -35, CURRENT_TIMESTAMP), DATEADD('HOUR', -35, CURRENT_TIMESTAMP)
FROM users u JOIN pickup_locations p ON p.university_id = u.university_id
WHERE u.email = 'test08@pukyong.ac.kr' AND u.oauth_provider = 'LOCAL' AND u.oauth_id = 'test08@pukyong.ac.kr' AND p.name = '누리관'
AND NOT EXISTS (SELECT 1 FROM items existing WHERE existing.owner_id = u.id AND existing.title = '2인용 텐트');

INSERT INTO items (owner_id, pickup_location_id, type, title, rental_fee, rental_unit, description, precautions, status, view_count, created_at, updated_at)
SELECT u.id, p.id, 'LEND', '캠핑 의자', 2000, 'DAY',
'캠핑 의자 대여합니다. 수령 시간은 채팅으로 정해요.',
'반납 시간을 지켜 주세요. 사용 후 깨끗하게 정리하고 분실이나 파손 시 채팅으로 알려 주세요.',
'AVAILABLE', 0, DATEADD('HOUR', -36, CURRENT_TIMESTAMP), DATEADD('HOUR', -36, CURRENT_TIMESTAMP)
FROM users u JOIN pickup_locations p ON p.university_id = u.university_id
WHERE u.email = 'test08@pukyong.ac.kr' AND u.oauth_provider = 'LOCAL' AND u.oauth_id = 'test08@pukyong.ac.kr' AND p.name = '청운관'
AND NOT EXISTS (SELECT 1 FROM items existing WHERE existing.owner_id = u.id AND existing.title = '캠핑 의자');

INSERT INTO items (owner_id, pickup_location_id, type, title, rental_fee, rental_unit, description, precautions, status, view_count, created_at, updated_at)
SELECT u.id, p.id, 'LEND', '돗자리', 3000, 'DAY',
'돗자리 대여합니다. 수령 시간은 채팅으로 정해요.',
'반납 시간을 지켜 주세요. 사용 후 깨끗하게 정리하고 분실이나 파손 시 채팅으로 알려 주세요.',
'AVAILABLE', 0, DATEADD('HOUR', -37, CURRENT_TIMESTAMP), DATEADD('HOUR', -37, CURRENT_TIMESTAMP)
FROM users u JOIN pickup_locations p ON p.university_id = u.university_id
WHERE u.email = 'test08@pukyong.ac.kr' AND u.oauth_provider = 'LOCAL' AND u.oauth_id = 'test08@pukyong.ac.kr' AND p.name = '중앙도서관'
AND NOT EXISTS (SELECT 1 FROM items existing WHERE existing.owner_id = u.id AND existing.title = '돗자리');

INSERT INTO items (owner_id, pickup_location_id, type, title, rental_fee, rental_unit, description, precautions, status, view_count, created_at, updated_at)
SELECT u.id, p.id, 'LEND', '아이스박스', 5000, 'DAY',
'아이스박스 대여합니다. 수령 시간은 채팅으로 정해요.',
'반납 시간을 지켜 주세요. 사용 후 깨끗하게 정리하고 분실이나 파손 시 채팅으로 알려 주세요.',
'AVAILABLE', 0, DATEADD('HOUR', -38, CURRENT_TIMESTAMP), DATEADD('HOUR', -38, CURRENT_TIMESTAMP)
FROM users u JOIN pickup_locations p ON p.university_id = u.university_id
WHERE u.email = 'test08@pukyong.ac.kr' AND u.oauth_provider = 'LOCAL' AND u.oauth_id = 'test08@pukyong.ac.kr' AND p.name = '누리관'
AND NOT EXISTS (SELECT 1 FROM items existing WHERE existing.owner_id = u.id AND existing.title = '아이스박스');

INSERT INTO items (owner_id, pickup_location_id, type, title, rental_fee, rental_unit, description, precautions, status, view_count, created_at, updated_at)
SELECT u.id, p.id, 'LEND', '등산 스틱', 0, 'DAY',
'등산 스틱 대여합니다. 수령 시간은 채팅으로 정해요.',
'반납 시간을 지켜 주세요. 사용 후 깨끗하게 정리하고 분실이나 파손 시 채팅으로 알려 주세요.',
'AVAILABLE', 0, DATEADD('HOUR', -39, CURRENT_TIMESTAMP), DATEADD('HOUR', -39, CURRENT_TIMESTAMP)
FROM users u JOIN pickup_locations p ON p.university_id = u.university_id
WHERE u.email = 'test08@pukyong.ac.kr' AND u.oauth_provider = 'LOCAL' AND u.oauth_id = 'test08@pukyong.ac.kr' AND p.name = '청운관'
AND NOT EXISTS (SELECT 1 FROM items existing WHERE existing.owner_id = u.id AND existing.title = '등산 스틱');

INSERT INTO items (owner_id, pickup_location_id, type, title, rental_fee, rental_unit, description, precautions, status, view_count, created_at, updated_at)
SELECT u.id, p.id, 'LEND', '배드민턴 라켓 세트', 1000, 'DAY',
'배드민턴 라켓 세트 대여합니다. 수령 시간은 채팅으로 정해요.',
'반납 시간을 지켜 주세요. 사용 후 깨끗하게 정리하고 분실이나 파손 시 채팅으로 알려 주세요.',
'AVAILABLE', 0, DATEADD('HOUR', -40, CURRENT_TIMESTAMP), DATEADD('HOUR', -40, CURRENT_TIMESTAMP)
FROM users u JOIN pickup_locations p ON p.university_id = u.university_id
WHERE u.email = 'test09@pukyong.ac.kr' AND u.oauth_provider = 'LOCAL' AND u.oauth_id = 'test09@pukyong.ac.kr' AND p.name = '중앙도서관'
AND NOT EXISTS (SELECT 1 FROM items existing WHERE existing.owner_id = u.id AND existing.title = '배드민턴 라켓 세트');

INSERT INTO items (owner_id, pickup_location_id, type, title, rental_fee, rental_unit, description, precautions, status, view_count, created_at, updated_at)
SELECT u.id, p.id, 'LEND', '농구공', 2000, 'DAY',
'농구공 대여합니다. 수령 시간은 채팅으로 정해요.',
'반납 시간을 지켜 주세요. 사용 후 깨끗하게 정리하고 분실이나 파손 시 채팅으로 알려 주세요.',
'AVAILABLE', 0, DATEADD('HOUR', -41, CURRENT_TIMESTAMP), DATEADD('HOUR', -41, CURRENT_TIMESTAMP)
FROM users u JOIN pickup_locations p ON p.university_id = u.university_id
WHERE u.email = 'test09@pukyong.ac.kr' AND u.oauth_provider = 'LOCAL' AND u.oauth_id = 'test09@pukyong.ac.kr' AND p.name = '누리관'
AND NOT EXISTS (SELECT 1 FROM items existing WHERE existing.owner_id = u.id AND existing.title = '농구공');

INSERT INTO items (owner_id, pickup_location_id, type, title, rental_fee, rental_unit, description, precautions, status, view_count, created_at, updated_at)
SELECT u.id, p.id, 'LEND', '축구공', 3000, 'DAY',
'축구공 대여합니다. 수령 시간은 채팅으로 정해요.',
'반납 시간을 지켜 주세요. 사용 후 깨끗하게 정리하고 분실이나 파손 시 채팅으로 알려 주세요.',
'AVAILABLE', 0, DATEADD('HOUR', -42, CURRENT_TIMESTAMP), DATEADD('HOUR', -42, CURRENT_TIMESTAMP)
FROM users u JOIN pickup_locations p ON p.university_id = u.university_id
WHERE u.email = 'test09@pukyong.ac.kr' AND u.oauth_provider = 'LOCAL' AND u.oauth_id = 'test09@pukyong.ac.kr' AND p.name = '청운관'
AND NOT EXISTS (SELECT 1 FROM items existing WHERE existing.owner_id = u.id AND existing.title = '축구공');

INSERT INTO items (owner_id, pickup_location_id, type, title, rental_fee, rental_unit, description, precautions, status, view_count, created_at, updated_at)
SELECT u.id, p.id, 'LEND', '요가 매트', 5000, 'DAY',
'요가 매트 대여합니다. 수령 시간은 채팅으로 정해요.',
'반납 시간을 지켜 주세요. 사용 후 깨끗하게 정리하고 분실이나 파손 시 채팅으로 알려 주세요.',
'AVAILABLE', 0, DATEADD('HOUR', -43, CURRENT_TIMESTAMP), DATEADD('HOUR', -43, CURRENT_TIMESTAMP)
FROM users u JOIN pickup_locations p ON p.university_id = u.university_id
WHERE u.email = 'test09@pukyong.ac.kr' AND u.oauth_provider = 'LOCAL' AND u.oauth_id = 'test09@pukyong.ac.kr' AND p.name = '중앙도서관'
AND NOT EXISTS (SELECT 1 FROM items existing WHERE existing.owner_id = u.id AND existing.title = '요가 매트');

INSERT INTO items (owner_id, pickup_location_id, type, title, rental_fee, rental_unit, description, precautions, status, view_count, created_at, updated_at)
SELECT u.id, p.id, 'LEND', '폼롤러', 0, 'DAY',
'폼롤러 대여합니다. 수령 시간은 채팅으로 정해요.',
'반납 시간을 지켜 주세요. 사용 후 깨끗하게 정리하고 분실이나 파손 시 채팅으로 알려 주세요.',
'AVAILABLE', 0, DATEADD('HOUR', -44, CURRENT_TIMESTAMP), DATEADD('HOUR', -44, CURRENT_TIMESTAMP)
FROM users u JOIN pickup_locations p ON p.university_id = u.university_id
WHERE u.email = 'test09@pukyong.ac.kr' AND u.oauth_provider = 'LOCAL' AND u.oauth_id = 'test09@pukyong.ac.kr' AND p.name = '누리관'
AND NOT EXISTS (SELECT 1 FROM items existing WHERE existing.owner_id = u.id AND existing.title = '폼롤러');

INSERT INTO items (owner_id, pickup_location_id, type, title, rental_fee, rental_unit, description, precautions, status, view_count, created_at, updated_at)
SELECT u.id, p.id, 'LEND', '보드게임 세트', 1000, 'DAY',
'보드게임 세트 대여합니다. 수령 시간은 채팅으로 정해요.',
'반납 시간을 지켜 주세요. 사용 후 깨끗하게 정리하고 분실이나 파손 시 채팅으로 알려 주세요.',
'AVAILABLE', 0, DATEADD('HOUR', -45, CURRENT_TIMESTAMP), DATEADD('HOUR', -45, CURRENT_TIMESTAMP)
FROM users u JOIN pickup_locations p ON p.university_id = u.university_id
WHERE u.email = 'test10@pukyong.ac.kr' AND u.oauth_provider = 'LOCAL' AND u.oauth_id = 'test10@pukyong.ac.kr' AND p.name = '청운관'
AND NOT EXISTS (SELECT 1 FROM items existing WHERE existing.owner_id = u.id AND existing.title = '보드게임 세트');

INSERT INTO items (owner_id, pickup_location_id, type, title, rental_fee, rental_unit, description, precautions, status, view_count, created_at, updated_at)
SELECT u.id, p.id, 'LEND', '여행용 캐리어', 2000, 'DAY',
'여행용 캐리어 대여합니다. 수령 시간은 채팅으로 정해요.',
'반납 시간을 지켜 주세요. 사용 후 깨끗하게 정리하고 분실이나 파손 시 채팅으로 알려 주세요.',
'AVAILABLE', 0, DATEADD('HOUR', -46, CURRENT_TIMESTAMP), DATEADD('HOUR', -46, CURRENT_TIMESTAMP)
FROM users u JOIN pickup_locations p ON p.university_id = u.university_id
WHERE u.email = 'test10@pukyong.ac.kr' AND u.oauth_provider = 'LOCAL' AND u.oauth_id = 'test10@pukyong.ac.kr' AND p.name = '중앙도서관'
AND NOT EXISTS (SELECT 1 FROM items existing WHERE existing.owner_id = u.id AND existing.title = '여행용 캐리어');

INSERT INTO items (owner_id, pickup_location_id, type, title, rental_fee, rental_unit, description, precautions, status, view_count, created_at, updated_at)
SELECT u.id, p.id, 'LEND', '휴대용 빔프로젝터', 3000, 'DAY',
'휴대용 빔프로젝터 대여합니다. 수령 시간은 채팅으로 정해요.',
'반납 시간을 지켜 주세요. 사용 후 깨끗하게 정리하고 분실이나 파손 시 채팅으로 알려 주세요.',
'AVAILABLE', 0, DATEADD('HOUR', -47, CURRENT_TIMESTAMP), DATEADD('HOUR', -47, CURRENT_TIMESTAMP)
FROM users u JOIN pickup_locations p ON p.university_id = u.university_id
WHERE u.email = 'test10@pukyong.ac.kr' AND u.oauth_provider = 'LOCAL' AND u.oauth_id = 'test10@pukyong.ac.kr' AND p.name = '누리관'
AND NOT EXISTS (SELECT 1 FROM items existing WHERE existing.owner_id = u.id AND existing.title = '휴대용 빔프로젝터');

INSERT INTO items (owner_id, pickup_location_id, type, title, rental_fee, rental_unit, description, precautions, status, view_count, created_at, updated_at)
SELECT u.id, p.id, 'LEND', '스팀 다리미', 5000, 'DAY',
'스팀 다리미 대여합니다. 수령 시간은 채팅으로 정해요.',
'반납 시간을 지켜 주세요. 사용 후 깨끗하게 정리하고 분실이나 파손 시 채팅으로 알려 주세요.',
'AVAILABLE', 0, DATEADD('HOUR', -48, CURRENT_TIMESTAMP), DATEADD('HOUR', -48, CURRENT_TIMESTAMP)
FROM users u JOIN pickup_locations p ON p.university_id = u.university_id
WHERE u.email = 'test10@pukyong.ac.kr' AND u.oauth_provider = 'LOCAL' AND u.oauth_id = 'test10@pukyong.ac.kr' AND p.name = '청운관'
AND NOT EXISTS (SELECT 1 FROM items existing WHERE existing.owner_id = u.id AND existing.title = '스팀 다리미');

INSERT INTO items (owner_id, pickup_location_id, type, title, rental_fee, rental_unit, description, precautions, status, view_count, created_at, updated_at)
SELECT u.id, p.id, 'LEND', '접이식 카트', 0, 'DAY',
'접이식 카트 대여합니다. 수령 시간은 채팅으로 정해요.',
'반납 시간을 지켜 주세요. 사용 후 깨끗하게 정리하고 분실이나 파손 시 채팅으로 알려 주세요.',
'AVAILABLE', 0, DATEADD('HOUR', -49, CURRENT_TIMESTAMP), DATEADD('HOUR', -49, CURRENT_TIMESTAMP)
FROM users u JOIN pickup_locations p ON p.university_id = u.university_id
WHERE u.email = 'test10@pukyong.ac.kr' AND u.oauth_provider = 'LOCAL' AND u.oauth_id = 'test10@pukyong.ac.kr' AND p.name = '중앙도서관'
AND NOT EXISTS (SELECT 1 FROM items existing WHERE existing.owner_id = u.id AND existing.title = '접이식 카트');

-- 실제 게시물 ID 1~10에 연결합니다. 빈 DB에서는 위 게시물 입력 순서와 같습니다.
-- 재실행 시 같은 게시물/사진 URL은 중복 등록하지 않습니다.
INSERT INTO item_images (item_id, image_url, sort_order, created_at)
SELECT photo.item_id, photo.image_url, 0, CURRENT_TIMESTAMP
FROM (VALUES
    (1, '/uploads/test/1.jpg'),
    (2, '/uploads/test/2.webp'),
    (3, '/uploads/test/3.jpg'),
    (4, '/uploads/test/4.webp'),
    (5, '/uploads/test/5.jpg'),
    (6, '/uploads/test/6.png'),
    (7, '/uploads/test/7.png'),
    (8, '/uploads/test/8.png'),
    (9, '/uploads/test/9.png'),
    (10, '/uploads/test/10.png')
) AS photo(item_id, image_url)
WHERE NOT EXISTS (
    SELECT 1 FROM item_images existing
    WHERE existing.item_id = photo.item_id AND existing.image_url = photo.image_url
);

