-- ====================================================================
-- 시연용 통합 시드 — 한 방에 큐레이션 데모 환경 리셋
--
-- 흐름:
--   1) DROP/CREATE: picks · ratings · users · reviews 테이블
--   2) INSERT: 도메인 시드 (picks 14건 / ratings 27건 / users 5명 / reviews 8건)
--   3) DELETE/INSERT: curation·curation_extension 11건
--      (curation_spec 은 SpecBootstrap 이 부트 시 spec/*.json 으로 자동 sync — 건드리지 않음)
--
-- 사전:
--   - schema.sql (curation_spec / curation / curation_extension) 적재 완료
--   - dev-snapshot.sql (alcohols / regions / distilleries / tasting_tags 마스터) 적재 완료
--   - 부트 1회 기동되어 SpecBootstrap 이 spec/*.json → curation_spec 적재 완료
--
-- 실행:
--   docker exec -i mysql mysql -u bottle_note -p'bottle_note_1234' \
--     --default-character-set=utf8mb4 bottle_note < demo-seed.sql
-- ====================================================================

-- ============================================================
-- §1. 별점·찜 도메인 — schema-explore.sql
-- ============================================================
DROP TABLE IF EXISTS ratings;
DROP TABLE IF EXISTS picks;

CREATE TABLE ratings (
    alcohol_id     BIGINT      NOT NULL COMMENT '평가 대상 술',
    user_id        BIGINT      NOT NULL COMMENT '평가자',
    rating         DOUBLE      NOT NULL DEFAULT 0 COMMENT '0:삭제, 0.5:최저, 5:최고',
    create_at      TIMESTAMP   NULL DEFAULT CURRENT_TIMESTAMP,
    last_modify_at TIMESTAMP   NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    delete_at      TIMESTAMP   NULL DEFAULT NULL,
    PRIMARY KEY (alcohol_id, user_id),
    KEY idx_user_id (user_id)
) COMMENT '술 평점';

CREATE TABLE picks (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id        BIGINT       NOT NULL,
    alcohol_id     BIGINT       NOT NULL,
    status         VARCHAR(16)  NOT NULL COMMENT 'PICK / UNPICK',
    create_at      TIMESTAMP    NULL DEFAULT CURRENT_TIMESTAMP,
    last_modify_at TIMESTAMP    NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_user_id (user_id),
    KEY idx_alcohol_id (alcohol_id)
) COMMENT '찜하기';

INSERT INTO ratings (alcohol_id, user_id, rating) VALUES
    (1, 1, 4.5), (1, 2, 4.0), (1, 3, 3.5), (1, 4, 5.0),
    (2, 1, 3.0), (2, 2, 4.5), (2, 3, 4.0),
    (3, 2, 4.0), (3, 3, 4.0),
    (4, 1, 5.0),
    (5, 1, 3.5), (5, 2, 4.0), (5, 3, 4.5), (5, 4, 4.0),
    (6, 2, 3.0), (6, 3, 4.0),
    (7, 1, 4.5), (7, 2, 4.5), (7, 4, 5.0),
    (8, 1, 4.0), (8, 3, 4.5),
    (9, 1, 3.0),
    (10, 2, 4.5), (10, 3, 4.5),
    (9, 2, 4.0), (9, 4, 4.5),
    (10, 4, 5.0);

INSERT INTO picks (user_id, alcohol_id, status) VALUES
    (1, 1, 'PICK'), (1, 3, 'PICK'), (1, 5, 'PICK'), (1, 7, 'PICK'),
    (2, 1, 'PICK'), (2, 2, 'PICK'), (2, 4, 'PICK'),
    (3, 1, 'PICK'), (3, 3, 'PICK'), (3, 8, 'PICK'),
    (4, 7, 'PICK'),
    (1, 9, 'PICK'), (1, 9, 'UNPICK'),
    (5, 10, 'PICK');

-- ============================================================
-- §2. 사용자·리뷰 도메인 — schema-users-reviews.sql
-- ============================================================
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id        BIGINT       NOT NULL PRIMARY KEY,
    email     VARCHAR(128) NOT NULL UNIQUE,
    name      VARCHAR(64)  NOT NULL COMMENT '한글 이름',
    create_at TIMESTAMP    NULL DEFAULT CURRENT_TIMESTAMP
) COMMENT '사용자';

CREATE TABLE reviews (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    alcohol_id     BIGINT       NOT NULL,
    user_id        BIGINT       NOT NULL,
    title          VARCHAR(128) NULL,
    content        TEXT         NOT NULL,
    rating         DOUBLE       NULL,
    create_at      TIMESTAMP    NULL DEFAULT CURRENT_TIMESTAMP,
    last_modify_at TIMESTAMP    NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    delete_at      TIMESTAMP    NULL DEFAULT NULL,
    KEY idx_alcohol_id (alcohol_id),
    KEY idx_user_id (user_id)
) COMMENT '술 리뷰';

INSERT INTO users (id, email, name) VALUES
    (1, 'whale@example.com',   '김고래'),
    (2, 'tiger@example.com',   '이호랑'),
    (3, 'sparrow@example.com', '박참새'),
    (4, 'whisky@example.com',  '최위스'),
    (5, 'malt@example.com',    '정몰트');

INSERT INTO reviews (alcohol_id, user_id, title, content, rating) VALUES
    (1, 1, '셰리 폭격',      '오로로소 캐스크의 진한 단맛이 인상적. 끝맛도 길게 남는다. 입문용으로도 추천.',     4.5),
    (1, 2, '균형 잡힌 한 잔', '레드 헤드 라인업 중 가장 균형이 좋다. 데일리에도 부담 없는 스위트니스.',         4.0),
    (1, 3, '입문자에게도 OK','피트보다 단맛 위주라 부담 없음. 첫 위스키로 추천 가능.',                          3.5),
    (1, 4, '베스트 픽',       '아일랜드 위스키 중 단연 최고. 셰리 캐스크의 정수.',                                5.0),
    (5, 1, '바닐라 향',        '버번 캐스크의 영향으로 바닐라가 강하게 올라온다. 산뜻한 마무리.',                3.5),
    (5, 3, '데일리로 좋음',    '가격 대비 만족도 높음. 매일 한 잔 기울이기 좋다.',                                4.5),
    (7, 1, '풀바디',           '입에 꽉 차는 풍성함. 셰리 호불호 갈릴 듯.',                                       4.5),
    (8, 3, '오크 향',           '버건디 와인 캐스크 마무리 — 과실 향이 묵직하다.',                                4.5);

-- ============================================================
-- §3. 큐레이션 시드 — seed-curation.sql 본문
-- ============================================================
DELETE FROM curation_extension;
DELETE FROM curation;

-- ----- ALCOHOL_LIST × 3 -----
INSERT INTO curation (spec_id, name, description, cover_image_url, display_order, is_active)
  SELECT id, '셰리 캐스크 입문 5선',
         '오로로소·셰리 와인 캐스크의 진한 단맛과 마무리감을 즐기고 싶다면. 입문자도 무난한 도수대로 골랐다.',
         'https://d1e2y5wc27crnp.cloudfront.net/media/core/product/thumbnail/bf2e0730-d408-454b-9121-2cfaabe38bd9.webp',
         0, 1
  FROM curation_spec WHERE code = 'ALCOHOL_LIST';
INSERT INTO curation_extension (curation_id, spec_id, payload)
  SELECT c.id, c.spec_id,
         '[{"alcoholId":1,"comment":"오로로소 셰리 캐스크 풀 보디 — 입문자에게도 부담 없는 단맛 위주의 라이터스 티얼즈 시그니처."},{"alcoholId":9,"comment":"포트·마데이라 마무리까지 들어간 14년 — 셰리 풍미를 다층적으로 경험하기 좋다."},{"alcoholId":10,"comment":"Ex-Bourbon & Oloroso 더블 캐스크 12년 — 가성비와 균형 모두 잡힌 셰리 입문서."}]'
  FROM curation c WHERE c.spec_id = (SELECT id FROM curation_spec WHERE code='ALCOHOL_LIST') ORDER BY c.id DESC LIMIT 1;

INSERT INTO curation (spec_id, name, description, cover_image_url, display_order, is_active)
  SELECT id, '여름 데일리 4선',
         '도수 부담 없이 매일 한 잔 하기 좋은 위스키. 가벼운 바디, 시원한 마무리 위주로 골랐다.',
         'https://d3dvjqqnb91j9d.cloudfront.net/alcohols/whisky/dbdb9c75-6a0e-44a7-a334-17079a8c2f52.jpg',
         1, 1
  FROM curation_spec WHERE code = 'ALCOHOL_LIST';
INSERT INTO curation_extension (curation_id, spec_id, payload)
  SELECT c.id, c.spec_id,
         '[{"alcoholId":5,"comment":"버번 캐스크의 바닐라·꿀 향이 산뜻한 툴리바딘 — 이 가격대에서 단연 데일리감."},{"alcoholId":6,"comment":"캐리비안 럼 캐스크 피니시로 열대 과일 향이 도드라진다. 하이볼로 만들면 압권."},{"alcoholId":7,"comment":"탈라모어 듀의 가장 고전적인 라인업. 마일드해서 부담이 없다."},{"alcoholId":8,"comment":"사이다 캐스크 피니시 — 사과·배 향이 미묘하게 올라온다. 식전주로도."}]'
  FROM curation c WHERE c.spec_id = (SELECT id FROM curation_spec WHERE code='ALCOHOL_LIST') ORDER BY c.id DESC LIMIT 1;

INSERT INTO curation (spec_id, name, description, cover_image_url, display_order, is_active)
  SELECT id, '아이리시 위스키 코어 라인업',
         '라이터스 티얼즈와 탈라모어 듀 — 두 양조장의 시그니처를 한 눈에. 아일랜드 위스키 입문 코스.',
         NULL, 2, 1
  FROM curation_spec WHERE code = 'ALCOHOL_LIST';
INSERT INTO curation_extension (curation_id, spec_id, payload)
  SELECT c.id, c.spec_id,
         '[{"alcoholId":1,"comment":"라이터스 티얼즈 레드 헤드 — 셰리 폭격, 그러나 균형은 잃지 않은 한 병."},{"alcoholId":2,"comment":"더블 오크 — American & French Oak 의 부드러운 조화. 데일리에도 좋다."},{"alcoholId":3,"comment":"코퍼 팟 — Bourbon Barrels 100%. 전형적인 아이리시 팟 스틸의 부드러움."},{"alcoholId":7,"comment":"탈라모어 듀 레전더리 — 가장 클래식한 라인업으로 비교 시음하기 좋다."},{"alcoholId":9,"comment":"탈라모어 듀 14년 — 4가지 캐스크 피니시. 코어 라인업의 완성."}]'
  FROM curation c WHERE c.spec_id = (SELECT id FROM curation_spec WHERE code='ALCOHOL_LIST') ORDER BY c.id DESC LIMIT 1;

-- ----- PAIRING_LIST × 2 -----
INSERT INTO curation (spec_id, name, description, cover_image_url, display_order, is_active)
  SELECT id, '여름밤 페어링', '더위 가시는 늦은 밤 — 가벼운 안주와 위스키 한 잔. 음식 4종에 어울리는 위스키 매칭.', NULL, 0, 1
  FROM curation_spec WHERE code = 'PAIRING_LIST';
INSERT INTO curation_extension (curation_id, spec_id, payload)
  SELECT c.id, c.spec_id,
         '[{"itemName":"다크 초콜릿 70%","itemImageUrl":"https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=480","alcoholIds":[1,9],"pairingNote":"셰리 캐스크의 단맛이 카카오 쓴맛을 감싼다. 14년의 다층적 마무리는 디저트 페어링에 정석."},{"itemName":"훈제 연어","itemImageUrl":"https://images.unsplash.com/photo-1599084993091-1cb5c0721cc6?w=480","alcoholIds":[5],"pairingNote":"버번 캐스크의 바닐라가 연어 오일과 만나면 의외로 부드러운 마리아주."},{"itemName":"치즈 플래터 (블루+체다)","itemImageUrl":"https://images.unsplash.com/photo-1631379578550-7038263db1f3?w=480","alcoholIds":[1,10],"pairingNote":"셰리 풍미가 블루치즈의 짠맛, 체다의 묵직함과 균형."},{"itemName":"구운 견과류 한 줌","itemImageUrl":"https://images.unsplash.com/photo-1599405948133-8c64ed10dc26?w=480","alcoholIds":[2,8],"pairingNote":"오크 캐스크의 견과 향과 사이다 캐스크의 과실미 — 가벼운 야식으로."}]'
  FROM curation c WHERE c.spec_id = (SELECT id FROM curation_spec WHERE code='PAIRING_LIST') ORDER BY c.id DESC LIMIT 1;

INSERT INTO curation (spec_id, name, description, cover_image_url, display_order, is_active)
  SELECT id, '겨울 디저트와', '추운 밤 — 진한 디저트와 셰리·럼 캐스크 위스키. 단맛에 단맛 더하기.', NULL, 1, 1
  FROM curation_spec WHERE code = 'PAIRING_LIST';
INSERT INTO curation_extension (curation_id, spec_id, payload)
  SELECT c.id, c.spec_id,
         '[{"itemName":"크렘 브륄레","itemImageUrl":"https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?w=480","alcoholIds":[1,9],"pairingNote":"셰리 위스키와 캐러멜 표면 — 같은 결의 단맛이 풍성함을 더한다."},{"itemName":"초콜릿 가나슈 타르트","itemImageUrl":"https://images.unsplash.com/photo-1551024601-bec78aea704b?w=480","alcoholIds":[10,6],"pairingNote":"셰리·럼 캐스크 모두 초콜릿과 좋은 짝. 럼 캐스크는 트로피컬 향이 추가된다."},{"itemName":"구운 사과 파이","itemImageUrl":"https://images.unsplash.com/photo-1568571780765-9276ac8b75a2?w=480","alcoholIds":[8],"pairingNote":"사이다 캐스크 피니시 — 사과 향이 이미 들어 있어 자연스러운 매칭."}]'
  FROM curation c WHERE c.spec_id = (SELECT id FROM curation_spec WHERE code='PAIRING_LIST') ORDER BY c.id DESC LIMIT 1;

-- ----- PAIRING_MATRIX × 2 -----
INSERT INTO curation (spec_id, name, description, cover_image_url, display_order, is_active)
  SELECT id, '여름밤 매트릭스 (3×3)', '위스키 3종과 음식 3종의 모든 조합을 한 화면에. 어느 조합이 더 흥미로운지 직접 매핑.', NULL, 0, 1
  FROM curation_spec WHERE code = 'PAIRING_MATRIX';
INSERT INTO curation_extension (curation_id, spec_id, payload)
  SELECT c.id, c.spec_id,
         '{"primaryAxis":"ALCOHOL_TO_ITEM","items":[{"itemId":"item-1","name":"다크 초콜릿 70%","imageUrl":"https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=480"},{"itemId":"item-2","name":"훈제 연어","imageUrl":"https://images.unsplash.com/photo-1599084993091-1cb5c0721cc6?w=480"},{"itemId":"item-3","name":"구운 견과류","imageUrl":"https://images.unsplash.com/photo-1599405948133-8c64ed10dc26?w=480"}],"alcoholIds":[1,5,10],"links":[{"alcoholId":1,"itemId":"item-1","note":"셰리 ↔ 카카오의 정석"},{"alcoholId":1,"itemId":"item-3","note":"오크 견과류와도 잘 어울린다"},{"alcoholId":5,"itemId":"item-2","note":"버번 캐스크 ↔ 훈제 연어"},{"alcoholId":5,"itemId":"item-3","note":"데일리 안주로 무난"},{"alcoholId":10,"itemId":"item-1","note":"12년 셰리·버번 캐스크의 풍성함"}]}'
  FROM curation c WHERE c.spec_id = (SELECT id FROM curation_spec WHERE code='PAIRING_MATRIX') ORDER BY c.id DESC LIMIT 1;

INSERT INTO curation (spec_id, name, description, cover_image_url, display_order, is_active)
  SELECT id, '스테이크 코스 매트릭스', '스테이크 코스 4단계 — 식전·메인·치즈·디저트 — 와 위스키 4종의 매칭 가능성.', NULL, 1, 1
  FROM curation_spec WHERE code = 'PAIRING_MATRIX';
INSERT INTO curation_extension (curation_id, spec_id, payload)
  SELECT c.id, c.spec_id,
         '{"primaryAxis":"ITEM_TO_ALCOHOL","items":[{"itemId":"course-1","name":"에피타이저: 카르파초","imageUrl":"https://images.unsplash.com/photo-1551024506-0bccd828d307?w=480"},{"itemId":"course-2","name":"메인: 립아이 스테이크","imageUrl":"https://images.unsplash.com/photo-1546964124-0cce460f38ef?w=480"},{"itemId":"course-3","name":"치즈 플래터","imageUrl":"https://images.unsplash.com/photo-1631379578550-7038263db1f3?w=480"},{"itemId":"course-4","name":"초콜릿 디저트","imageUrl":"https://images.unsplash.com/photo-1551024601-bec78aea704b?w=480"}],"alcoholIds":[2,5,9,10],"links":[{"alcoholId":5,"itemId":"course-1","note":"가벼운 산미를 안 가린다"},{"alcoholId":2,"itemId":"course-2","note":"오크 풍미가 육향과 균형"},{"alcoholId":9,"itemId":"course-2","note":"14년의 깊이가 메인 코스와도 좋다"},{"alcoholId":10,"itemId":"course-3","note":"셰리·버번 캐스크의 다층적 풍미"},{"alcoholId":9,"itemId":"course-4","note":"포트·마데이라 마무리 → 디저트 정석"},{"alcoholId":10,"itemId":"course-4","note":"12년 셰리 — 진한 초콜릿과 단짠"}]}'
  FROM curation c WHERE c.spec_id = (SELECT id FROM curation_spec WHERE code='PAIRING_MATRIX') ORDER BY c.id DESC LIMIT 1;

-- ----- TASTING_V1 × 2 -----
INSERT INTO curation (spec_id, name, description, cover_image_url, display_order, is_active)
  SELECT id, '오가닉 바 5월 정기 시음회', '아일랜드 위스키 4종 비교 시음. 라이터스 티얼즈 vs 탈라모어 듀.', NULL, 0, 1
  FROM curation_spec WHERE code = 'TASTING_V1';
INSERT INTO curation_extension (curation_id, spec_id, payload)
  SELECT c.id, c.spec_id,
         '{"eventDate":"2026-05-15","startTime":"19:30:00","endTime":"22:00:00","eventNotes":["우천 시 1주 연기","본격 시작 30분 전 오프닝"],"venueName":"오가닉 바, 성수","venueAddress":"서울 성동구 연무장7길 11, 2F","venueLat":37.544,"venueLng":127.0557,"venueNotes":["2층 직접 입장","엘리베이터 없음"],"entryFee":75000,"capacity":20,"feeNotes":["환불 D-3까지","노쇼 시 50% 차감"],"alcohols":[{"alcoholId":1,"comment":"오프닝: 셰리 폭격으로 첫인상 강하게"},{"alcoholId":5,"comment":"버번 캐스크 — 셰리 다음 산뜻한 전환"},{"alcoholId":9,"comment":"탈라모어 듀 14년 — 다층 마무리, 코어"},{"alcoholId":10,"comment":"마무리: 12년 — 부드러운 클로징"}]}'
  FROM curation c WHERE c.spec_id = (SELECT id FROM curation_spec WHERE code='TASTING_V1') ORDER BY c.id DESC LIMIT 1;

INSERT INTO curation (spec_id, name, description, cover_image_url, display_order, is_active)
  SELECT id, '셰리 캐스크 마스터 클래스', '셰리 캐스크 위스키만 골라 비교. 진한 단맛과 캐릭터의 차이를 느껴보세요.', NULL, 1, 1
  FROM curation_spec WHERE code = 'TASTING_V1';
INSERT INTO curation_extension (curation_id, spec_id, payload)
  SELECT c.id, c.spec_id,
         '{"eventDate":"2026-06-12","startTime":"20:00:00","endTime":"22:30:00","eventNotes":["사전 예약 필수"],"venueName":"위스키 라이브러리, 한남","venueAddress":"서울 용산구 한남대로 27길 12","venueLat":37.535,"venueLng":127.001,"venueNotes":["발렛 가능","주차장 협소"],"entryFee":120000,"capacity":12,"feeNotes":["환불 D-7까지","친구 동반 시 10% 할인"],"alcohols":[{"alcoholId":1,"comment":"오로로소 셰리 캐스크 — 클래식한 셰리 캐릭터"},{"alcoholId":9,"comment":"포트·셰리·마데이라 마무리 — 셰리의 진화"},{"alcoholId":10,"comment":"Ex-Bourbon & Oloroso — 셰리와 버번의 균형"}]}'
  FROM curation c WHERE c.spec_id = (SELECT id FROM curation_spec WHERE code='TASTING_V1') ORDER BY c.id DESC LIMIT 1;

-- ----- ALCOHOL_PROFILE × 2 -----
INSERT INTO curation (spec_id, name, description, cover_image_url, display_order, is_active)
  SELECT id, '라이터스 티얼즈 레드 헤드 프로파일', '평점·찜·리뷰까지 한 화면에 모은 알코올 단건 프로파일.',
         'https://d1e2y5wc27crnp.cloudfront.net/media/core/product/thumbnail/bf2e0730-d408-454b-9121-2cfaabe38bd9.webp',
         0, 1
  FROM curation_spec WHERE code = 'ALCOHOL_PROFILE';
INSERT INTO curation_extension (curation_id, spec_id, payload)
  SELECT c.id, c.spec_id,
         '{"alcoholId":1,"headline":"셰리 입문에 가장 추천하는 한 병 — 단맛·균형·가격 삼박자."}'
  FROM curation c WHERE c.spec_id = (SELECT id FROM curation_spec WHERE code='ALCOHOL_PROFILE') ORDER BY c.id DESC LIMIT 1;

INSERT INTO curation (spec_id, name, description, cover_image_url, display_order, is_active)
  SELECT id, '툴리바딘 소버린 프로파일', '버번 캐스크 데일리 위스키 — 평점·찜·리뷰 종합 프로파일.',
         'https://d3dvjqqnb91j9d.cloudfront.net/alcohols/whisky/dbdb9c75-6a0e-44a7-a334-17079a8c2f52.jpg',
         1, 1
  FROM curation_spec WHERE code = 'ALCOHOL_PROFILE';
INSERT INTO curation_extension (curation_id, spec_id, payload)
  SELECT c.id, c.spec_id,
         '{"alcoholId":5,"headline":"가성비 데일리 1순위 — 버번 캐스크의 산뜻한 바닐라."}'
  FROM curation c WHERE c.spec_id = (SELECT id FROM curation_spec WHERE code='ALCOHOL_PROFILE') ORDER BY c.id DESC LIMIT 1;

-- ============================================================
-- 검증
-- ============================================================
SELECT '===== 도메인 시드 =====' AS section;
SELECT 'users'   AS tbl, COUNT(*) AS cnt FROM users
UNION ALL SELECT 'reviews', COUNT(*) FROM reviews
UNION ALL SELECT 'ratings', COUNT(*) FROM ratings
UNION ALL SELECT 'picks',   COUNT(*) FROM picks;

SELECT '===== 큐레이션 시드 =====' AS section;
SELECT s.code AS spec_code, COUNT(*) AS curation_count
  FROM curation c JOIN curation_spec s ON c.spec_id = s.id
  GROUP BY s.code ORDER BY s.code;

SELECT '===== 큐레이션 목록 =====' AS section;
SELECT c.id, s.code AS spec_code, c.display_order AS ord, c.name
  FROM curation c JOIN curation_spec s ON c.spec_id = s.id
  ORDER BY s.code, c.display_order, c.id;
