MERGE INTO universities (name)
KEY (name)
VALUES ('부경대학교');

MERGE INTO pickup_locations (university_id, name)
KEY (university_id, name)
VALUES ((SELECT id FROM universities WHERE name = '부경대학교'), '청운관');

MERGE INTO pickup_locations (university_id, name)
KEY (university_id, name)
VALUES ((SELECT id FROM universities WHERE name = '부경대학교'), '중앙도서관');

MERGE INTO pickup_locations (university_id, name)
KEY (university_id, name)
VALUES ((SELECT id FROM universities WHERE name = '부경대학교'), '누리관');
