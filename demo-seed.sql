-- ====================================================================
-- 시연용 통합 시드 — 확정 스펙 3종 기준 초기 데이터
--
-- 흐름:
--   1) DROP/CREATE: picks · ratings · users · reviews 테이블
--   2) INSERT: 도메인 시드 (ratings 27건 / picks 14건 / users 5명 / reviews 8건)
--   3) DELETE/INSERT: curation · curation_extension 5건
--      (curation_spec 은 SpecBootstrap 이 spec/*.json 으로 sync)
--
-- 사전:
--   - schema.sql 적재 완료
--   - dev-snapshot.sql 적재 완료
--   - 부트 1회 기동되어 SpecBootstrap 이 spec/*.json → curation_spec 적재 완료
--
-- 실행:
--   docker exec -i mysql mysql -u bottle_note -p'bottle_note_1234' \
--     --default-character-set=utf8mb4 bottle_note < demo-seed.sql
-- ====================================================================

-- ============================================================
-- §1. 별점·찜 도메인
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
    (9, 1, 3.0), (9, 2, 4.0), (9, 4, 4.5),
    (10, 2, 4.5), (10, 3, 4.5), (10, 4, 5.0);

INSERT INTO picks (user_id, alcohol_id, status) VALUES
    (1, 1, 'PICK'), (1, 3, 'PICK'), (1, 5, 'PICK'), (1, 7, 'PICK'),
    (2, 1, 'PICK'), (2, 2, 'PICK'), (2, 4, 'PICK'),
    (3, 1, 'PICK'), (3, 3, 'PICK'), (3, 8, 'PICK'),
    (4, 7, 'PICK'),
    (1, 9, 'PICK'), (1, 9, 'UNPICK'),
    (5, 10, 'PICK');

-- ============================================================
-- §2. 사용자·리뷰 도메인
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
    (1, 1, '셰리 폭격',      '오로로소 캐스크의 진한 단맛이 인상적. 끝맛도 길게 남는다. 입문용으로도 추천.', 4.5),
    (1, 2, '균형 잡힌 한 잔', '레드 헤드 라인업 중 가장 균형이 좋다. 데일리에도 부담 없는 스위트니스.', 4.0),
    (1, 3, '입문자에게도 OK','피트보다 단맛 위주라 부담 없음. 첫 위스키로 추천 가능.', 3.5),
    (1, 4, '베스트 픽',      '아일랜드 위스키 중 단연 최고. 셰리 캐스크의 정수.', 5.0),
    (5, 1, '바닐라 향',      '버번 캐스크의 영향으로 바닐라가 강하게 올라온다. 산뜻한 마무리.', 3.5),
    (5, 3, '데일리로 좋음',  '가격 대비 만족도 높음. 매일 한 잔 기울이기 좋다.', 4.5),
    (7, 1, '풀바디',         '입에 꽉 차는 풍성함. 셰리 호불호 갈릴 듯.', 4.5),
    (8, 3, '오크 향',        '버건디 와인 캐스크 마무리 — 과실 향이 묵직하다.', 4.5);

-- ============================================================
-- §3. 큐레이션 시드
-- ============================================================

DELETE FROM curation_extension;
DELETE FROM curation;

INSERT INTO curation (spec_id, name, description, cover_image_url, image_url_2, image_url_3, exposure_start_date, exposure_end_date, display_order, is_active)
  SELECT id,
         '미운날 피트위스키 추천',
         '연기, 바다 내음, 묵직한 피트 향이 뚜렷한 날을 위한 위스키 추천 큐레이션.',
         'https://d1e2y5wc27crnp.cloudfront.net/media/core/product/thumbnail/bf2e0730-d408-454b-9121-2cfaabe38bd9.webp',
         'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=900',
         'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=900',
         '2025-06-05', '2025-06-10',
         0, 1
  FROM curation_spec WHERE code = 'RECOMMENDED_WHISKY';
INSERT INTO curation_extension (curation_id, spec_id, payload)
  SELECT c.id, c.spec_id,
         '[{"alcoholId":1,"comment":"강한 향보다 균형감 있는 단맛으로 시작하기 좋은 첫 번째 추천."},{"alcoholId":5,"comment":"버번 캐스크의 바닐라와 산뜻한 마무리로 부담 없이 즐길 수 있는 데일리 픽."}]'
  FROM curation c WHERE c.spec_id = (SELECT id FROM curation_spec WHERE code='RECOMMENDED_WHISKY') ORDER BY c.id DESC LIMIT 1;

INSERT INTO curation (spec_id, name, description, cover_image_url, image_url_2, image_url_3, exposure_start_date, exposure_end_date, display_order, is_active)
  SELECT id,
         '셰리 캐스크 입문 추천',
         '진한 단맛과 긴 여운을 느끼기 좋은 셰리 캐스크 중심의 입문 큐레이션.',
         'https://d3dvjqqnb91j9d.cloudfront.net/alcohols/whisky/dbdb9c75-6a0e-44a7-a334-17079a8c2f52.jpg',
         'https://images.unsplash.com/photo-1582819509237-d5b75f20ff7a?w=900',
         'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=900',
         '2025-06-05', '2025-06-10',
         1, 1
  FROM curation_spec WHERE code = 'RECOMMENDED_WHISKY';
INSERT INTO curation_extension (curation_id, spec_id, payload)
  SELECT c.id, c.spec_id,
         '[{"alcoholId":1,"comment":"오로로소 셰리 캐스크의 진한 단맛이 인상적인 입문 추천 위스키."},{"alcoholId":9,"comment":"포트와 마데이라 마무리까지 더해져 셰리 풍미를 다층적으로 느끼기 좋다."},{"alcoholId":10,"comment":"버번과 셰리 캐스크의 균형이 좋아 비교 시음용으로 적합하다."}]'
  FROM curation c WHERE c.spec_id = (SELECT id FROM curation_spec WHERE code='RECOMMENDED_WHISKY') ORDER BY c.id DESC LIMIT 1;

INSERT INTO curation (spec_id, name, description, cover_image_url, image_url_2, image_url_3, exposure_start_date, exposure_end_date, display_order, is_active)
  SELECT id,
         '위스키와 잘 어울리는 디저트',
         '진한 디저트와 위스키를 함께 즐기기 위한 페어링 큐레이션.',
         'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=900',
         'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=900',
         'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=900',
         '2025-06-05', '2025-06-10',
         0, 1
  FROM curation_spec WHERE code = 'WHISKY_PAIRING';
INSERT INTO curation_extension (curation_id, spec_id, payload)
  SELECT c.id, c.spec_id,
         '[{"alcoholId":1,"comment":"셰리 캐스크의 단맛과 견과 향이 디저트를 단단하게 받쳐준다.","pairings":[{"itemName":"부드러운 티라미수 초콜릿","itemImageUrl":"https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=480","pairingNote":"쌉싸름한 카카오와 크림의 단맛이 위스키의 셰리 풍미와 이어진다."},{"itemName":"초콜릿 가나슈 타르트","itemImageUrl":"https://images.unsplash.com/photo-1551024601-bec78aea704b?w=480","pairingNote":"진한 초콜릿 질감이 오렌지와 건과일 향을 더 도드라지게 만든다."}]},{"alcoholId":10,"comment":"버번과 셰리 캐스크의 균형이 좋아 무거운 디저트와도 부담이 적다.","pairings":[{"itemName":"캐러멜 푸딩","itemImageUrl":"https://images.unsplash.com/photo-1488477181946-6428a0291777?w=480","pairingNote":"캐러멜의 고소한 단맛이 바닐라와 오크 향을 부드럽게 연결한다."}]}]'
  FROM curation c WHERE c.spec_id = (SELECT id FROM curation_spec WHERE code='WHISKY_PAIRING') ORDER BY c.id DESC LIMIT 1;

INSERT INTO curation (spec_id, name, description, cover_image_url, image_url_2, image_url_3, exposure_start_date, exposure_end_date, display_order, is_active)
  SELECT id,
         '여름밤 가벼운 안주 페어링',
         '늦은 밤 부담 없이 곁들이기 좋은 음식과 위스키 조합.',
         'https://images.unsplash.com/photo-1631379578550-7038263db1f3?w=900',
         'https://images.unsplash.com/photo-1599405948133-8c64ed10dc26?w=900',
         'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=900',
         '2025-06-05', '2025-06-10',
         1, 1
  FROM curation_spec WHERE code = 'WHISKY_PAIRING';
INSERT INTO curation_extension (curation_id, spec_id, payload)
  SELECT c.id, c.spec_id,
         '[{"alcoholId":1,"comment":"짭짤한 안주와 함께 마셔도 단맛과 향이 흐트러지지 않는다.","pairings":[{"itemName":"치즈 플래터","itemImageUrl":"https://images.unsplash.com/photo-1631379578550-7038263db1f3?w=480","pairingNote":"치즈의 짠맛과 질감이 셰리 캐스크의 묵직함을 부드럽게 받쳐준다."}]},{"alcoholId":8,"comment":"가벼운 과실 향이 밤 안주와 산뜻하게 맞는다.","pairings":[{"itemName":"구운 견과류","itemImageUrl":"https://images.unsplash.com/photo-1599405948133-8c64ed10dc26?w=480","pairingNote":"견과류의 고소함이 오크와 바닐라 향을 자연스럽게 끌어낸다."}]}]'
  FROM curation c WHERE c.spec_id = (SELECT id FROM curation_spec WHERE code='WHISKY_PAIRING') ORDER BY c.id DESC LIMIT 1;

INSERT INTO curation (spec_id, name, description, cover_image_url, image_url_2, image_url_3, exposure_start_date, exposure_end_date, display_order, is_active)
  SELECT id,
         '도시남 X 보틀노트 시음회',
         '도시남과 보틀노트가 함께 준비한 위스키 시음회. 라인업별 향과 맛을 비교하며 즐기는 오프라인 이벤트.',
         'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=900',
         'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=900',
         'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=900',
         '2025-06-05', '2025-06-10',
         0, 1
  FROM curation_spec WHERE code = 'WHISKY_TASTING_EVENT';
INSERT INTO curation_extension (curation_id, spec_id, payload)
  SELECT c.id, c.spec_id,
         '{"eventDate":"2025-06-15","eventTime":"19:30","barAddress":"서울 강남구 테헤란로 123","detailAddress":"2층 도시남 바","isRecruiting":true,"entryFee":75000,"capacity":20,"applicationLink":"https://forms.example.com/bottlenote-tasting","guideText":"시작 10분 전 입장해 주세요. 라인업은 현장 상황에 따라 일부 변경될 수 있습니다.","alcohols":[{"alcoholId":1,"comment":"첫 잔으로 셰리 캐스크의 진한 단맛을 느끼기 좋은 위스키."},{"alcoholId":5,"comment":"중반부에는 버번 캐스크의 산뜻한 바닐라 향으로 전환."}]}'
  FROM curation c WHERE c.spec_id = (SELECT id FROM curation_spec WHERE code='WHISKY_TASTING_EVENT') ORDER BY c.id DESC LIMIT 1;

-- ============================================================
-- 검증
-- ============================================================

SELECT '===== 도메인 시드 =====' AS section;
SELECT 'users' AS tbl, COUNT(*) AS cnt FROM users
UNION ALL SELECT 'reviews', COUNT(*) FROM reviews
UNION ALL SELECT 'ratings', COUNT(*) FROM ratings
UNION ALL SELECT 'picks', COUNT(*) FROM picks;

SELECT '===== 큐레이션 시드 =====' AS section;
SELECT s.code AS spec_code, COUNT(*) AS curation_count
  FROM curation c JOIN curation_spec s ON c.spec_id = s.id
  GROUP BY s.code ORDER BY s.code;

SELECT '===== 큐레이션 목록 =====' AS section;
SELECT c.id, s.code AS spec_code, c.display_order AS ord, c.name
  FROM curation c JOIN curation_spec s ON c.spec_id = s.id
  ORDER BY s.code, c.display_order, c.id;
