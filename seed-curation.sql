-- ====================================================================
-- 큐레이션 데모 — 샘플 큐레이션 4건 시드
--
-- 사전 조건:
--   1) schema.sql (curation_spec / curation / curation_extension) 적용
--   2) dev-snapshot.sql 또는 알코올 도메인 마스터 적재
--   3) 부트 1회 기동 → SpecBootstrap 이 spec/*.json 을 curation_spec 에 sync
--
-- 실행:
--   docker exec -i mysql mysql -u bottle_note -p'bottle_note_1234' \
--     --default-character-set=utf8mb4 bottle_note < seed-curation.sql
--
-- 주의: 스펙 INSERT 는 SpecBootstrap (Java) 에서 자동 처리. 여기서는 큐레이션 데이터만 시드.
-- ====================================================================

-- 기존 큐레이션 데이터 정리 (스펙은 보존)
DELETE FROM curation_extension;
DELETE FROM curation;

-- ----- ALCOHOL_LIST 샘플 -----
INSERT INTO curation (spec_id, name, description, cover_image_url, display_order, is_active)
  SELECT id, '평점 풍부 위스키', '평점 데이터가 충분한 카드', NULL, 0, 1
  FROM curation_spec WHERE code = 'ALCOHOL_LIST';
INSERT INTO curation_extension (curation_id, spec_id, payload)
  SELECT c.id, c.spec_id,
         '[{"alcoholId": 1, "comment": "셰리 캐스크의 진한 단맛"}, {"alcoholId": 5, "comment": "가벼운 바디"}]'
  FROM curation c
  WHERE c.spec_id = (SELECT id FROM curation_spec WHERE code = 'ALCOHOL_LIST')
  ORDER BY c.id DESC LIMIT 1;

-- ----- PAIRING_LIST 샘플 -----
INSERT INTO curation (spec_id, name, description, cover_image_url, display_order, is_active)
  SELECT id, '여름밤 페어링', '음식별 페어링 카드', NULL, 0, 1
  FROM curation_spec WHERE code = 'PAIRING_LIST';
INSERT INTO curation_extension (curation_id, spec_id, payload)
  SELECT c.id, c.spec_id,
         '[{"itemName": "다크 초콜릿 70%", "itemImageUrl": "https://img/dark-choco.png", "alcoholIds": [1, 5], "pairingNote": "피트와 카카오"}, {"itemName": "훈제 연어", "itemImageUrl": "https://img/salmon.png", "alcoholIds": [1], "pairingNote": "오일리한 지방"}]'
  FROM curation c
  WHERE c.spec_id = (SELECT id FROM curation_spec WHERE code = 'PAIRING_LIST')
  ORDER BY c.id DESC LIMIT 1;

-- ----- PAIRING_MATRIX 샘플 -----
INSERT INTO curation (spec_id, name, description, cover_image_url, display_order, is_active)
  SELECT id, '여름밤 매트릭스', '위스키 ↔ 음식 매트릭스', NULL, 0, 1
  FROM curation_spec WHERE code = 'PAIRING_MATRIX';
INSERT INTO curation_extension (curation_id, spec_id, payload)
  SELECT c.id, c.spec_id,
         '{"primaryAxis": "ALCOHOL_TO_ITEM", "items": [{"itemId": "item-1", "name": "다크 초콜릿"}, {"itemId": "item-2", "name": "훈제 연어"}], "alcoholIds": [1, 5], "links": [{"alcoholId": 1, "itemId": "item-1"}, {"alcoholId": 5, "itemId": "item-2"}]}'
  FROM curation c
  WHERE c.spec_id = (SELECT id FROM curation_spec WHERE code = 'PAIRING_MATRIX')
  ORDER BY c.id DESC LIMIT 1;

-- ----- TASTING_V1 샘플 -----
INSERT INTO curation (spec_id, name, description, cover_image_url, display_order, is_active)
  SELECT id, '오가닉 바 5월 시음회', '5월 정기 시음회', NULL, 0, 1
  FROM curation_spec WHERE code = 'TASTING_V1';
INSERT INTO curation_extension (curation_id, spec_id, payload)
  SELECT c.id, c.spec_id,
         '{"eventDate": "2026-05-15", "startTime": "19:30:00", "endTime": "22:00:00", "eventNotes": ["우천 시 1주 연기"], "venueName": "오가닉 바, 성수", "venueAddress": "서울 성동구 연무장7길 11, 2F", "venueLat": 37.544, "venueLng": 127.0557, "venueNotes": ["2층 직접 입장"], "entryFee": 75000, "capacity": 20, "feeNotes": ["환불 D-3까지"], "alcohols": [{"alcoholId": 1, "comment": "오프닝"}, {"alcoholId": 5, "comment": "마무리"}]}'
  FROM curation c
  WHERE c.spec_id = (SELECT id FROM curation_spec WHERE code = 'TASTING_V1')
  ORDER BY c.id DESC LIMIT 1;

-- ----- ALCOHOL_PROFILE 샘플 -----
INSERT INTO curation (spec_id, name, description, cover_image_url, display_order, is_active)
  SELECT id, '라이터스 티얼즈 레드 헤드 프로파일', '한 알코올의 picks·ratings·reviews 모두 hydrate', NULL, 0, 1
  FROM curation_spec WHERE code = 'ALCOHOL_PROFILE';
INSERT INTO curation_extension (curation_id, spec_id, payload)
  SELECT c.id, c.spec_id,
         '{"alcoholId": 1, "headline": "셰리 입문에 가장 추천하는 한 병"}'
  FROM curation c
  WHERE c.spec_id = (SELECT id FROM curation_spec WHERE code = 'ALCOHOL_PROFILE')
  ORDER BY c.id DESC LIMIT 1;

-- 확인
SELECT c.id AS curation_id, s.code AS spec_code, c.name
  FROM curation c JOIN curation_spec s ON c.spec_id = s.id
  ORDER BY c.id;
