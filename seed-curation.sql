-- ====================================================================
-- 큐레이션 데모 — 스펙 4종 + 샘플 큐레이션 4건 시드
--
-- 사전 조건:
--   1) schema.sql (curation_spec / curation / curation_extension) 적용
--   2) dev-snapshot.sql 또는 알코올 도메인 마스터 (alcohols / regions / distilleries / tasting_tags / alcohols_tasting_tags) 적재
--
-- 실행:
--   docker exec -i mysql mysql -u bottle_note -p'bottle_note_1234' \
--     --default-character-set=utf8mb4 bottle_note < seed-curation.sql
-- ====================================================================

-- 기존 시드 정리
DELETE FROM curation_extension;
DELETE FROM curation;
DELETE FROM curation_spec;

-- ----- 1) 스펙 4종 -----
-- ALCOHOL_LIST
INSERT INTO curation_spec (code, name, description, hydrator_key, request_spec, response_spec) VALUES ('ALCOHOL_LIST','위스키 목록 추천','추천 위스키를 카드 N개로 나열하는 큐레이션. 각 카드는 알코올 마스터에서 hydrate된 정보(국가·카테고리·캐스크·도수·태그)와 큐레이터 코멘트로 구성된다.','alcohol','{"type": "object", "description": "위스키 목록 추천 큐레이션의 한 카드(항목) 등록 요청", "x-form-style": "alcohol-list", "properties": {"alcoholId": {"type": "integer", "format": "int64", "x-display-name": "위스키", "description": "알코올 ID (참조키). 카드 본문에 마스터 정보가 자동 hydrate.", "x-field-style": "alcohol-card"}, "comment": {"type": "string", "x-display-name": "큐레이터 코멘트 · 선택", "description": "마스터 정보 외 추가로 적고 싶은 한 줄", "x-field-style": "long-text"}}, "required": ["alcoholId"], "x-container": "array"}','{"type": "object", "description": "위스키 목록 추천의 한 카드 조회 응답. alcohol 마스터에서 풍부한 정보를 hydrate.", "x-form-style": "alcohol-list", "properties": {"alcoholId": {"type": "integer", "format": "int64", "x-field-style": "alcohol-card"}, "comment": {"type": "string", "x-field-style": "long-text"}, "korName": {"type": "string"}, "engName": {"type": "string"}, "imageUrl": {"type": "string"}, "regionName": {"type": "string"}, "korCategory": {"type": "string"}, "engCategory": {"type": "string"}, "cask": {"type": "string"}, "abv": {"type": "string"}, "volume": {"type": "string"}, "tags": {"type": "array", "items": {"type": "object", "properties": {"id": {"type": "integer", "format": "int64"}, "korName": {"type": "string"}, "engName": {"type": "string"}}, "required": ["id", "korName"]}}}, "required": ["alcoholId", "korName"]}');

-- PAIRING_LIST
INSERT INTO curation_spec (code, name, description, hydrator_key, request_spec, response_spec) VALUES ('PAIRING_LIST','페어링 (음식 카드형)','한 묶음 = 음식 1 + 위스키 N + 페어링 노트. 카드 N개 리스트.','alcohol','{"type": "object", "description": "페어링 카드(음식 1 + 위스키 N) 한 묶음 등록 요청", "x-form-style": "pairing-list", "properties": {"itemName": {"type": "string", "x-display-name": "페어링 음식 이름", "description": "페어링 음식 이름"}, "itemImageUrl": {"type": "string", "x-display-name": "페어링 음식 이미지 (1장)", "description": "페어링 음식 이미지 URL (추후 업로드 위젯 대체 예정)", "x-field-style": "image-upload"}, "alcoholIds": {"type": "array", "items": {"type": "integer", "format": "int64"}, "minItems": 1, "x-display-name": "페어링되는 위스키", "description": "여러 개 선택 가능 · 위스키 DB에서 바인딩됩니다.", "x-field-style": "alcohol-search-multi"}, "pairingNote": {"type": "string", "x-display-name": "페어링 설명", "description": "페어링 설명 (큐레이터 코멘트)", "x-field-style": "long-text"}}, "required": ["itemName", "alcoholIds"], "x-container": "array"}','{"type": "object", "description": "페어링 카드 조회 응답.", "x-form-style": "pairing-list", "properties": {"itemName": {"type": "string"}, "itemImageUrl": {"type": "string", "x-field-style": "image-upload"}, "alcohols": {"type": "array", "x-field-style": "alcohol-card-list", "items": {"type": "object", "properties": {"alcoholId": {"type": "integer", "format": "int64"}, "korName": {"type": "string"}, "engName": {"type": "string"}, "imageUrl": {"type": "string"}}, "required": ["alcoholId", "korName"]}}, "pairingNote": {"type": "string", "x-field-style": "long-text"}}, "required": ["itemName", "alcohols"]}');

-- PAIRING_MATRIX
INSERT INTO curation_spec (code, name, description, hydrator_key, request_spec, response_spec) VALUES ('PAIRING_MATRIX','페어링 (N:N 자유 연결)','위스키 배열 + 음식 배열 + 연결 N:N. 양방향 매트릭스 편집.','alcohol','{"type": "object", "description": "페어링 매트릭스 큐레이션 통째 등록 요청 (위스키 + 음식 + 연결)", "x-form-style": "pairing-matrix", "properties": {"primaryAxis": {"type": "string", "enum": ["ALCOHOL_TO_ITEM", "ITEM_TO_ALCOHOL"]}, "items": {"type": "array", "minItems": 1, "items": {"type": "object", "properties": {"itemId": {"type": "string"}, "name": {"type": "string"}, "imageUrl": {"type": "string"}}, "required": ["itemId", "name"]}}, "alcoholIds": {"type": "array", "items": {"type": "integer", "format": "int64"}, "minItems": 1}, "links": {"type": "array", "items": {"type": "object", "properties": {"alcoholId": {"type": "integer", "format": "int64"}, "itemId": {"type": "string"}, "note": {"type": "string"}}, "required": ["alcoholId", "itemId"]}}}, "required": ["primaryAxis", "items", "alcoholIds", "links"], "x-container": "object"}','{"type": "object", "x-form-style": "pairing-matrix", "properties": {"primaryAxis": {"type": "string"}, "items": {"type": "array", "items": {"type": "object"}}, "alcohols": {"type": "array", "items": {"type": "object"}}, "links": {"type": "array", "items": {"type": "object"}}, "stats": {"type": "object"}}}');

-- TASTING_V1
INSERT INTO curation_spec (code, name, description, hydrator_key, request_spec, response_spec) VALUES ('TASTING_V1','시음회','일시·장소·참가비·정원 슬롯 + 시음 위스키 카드 N개. 각 섹션마다 비고 최대 4개 추가 가능.','alcohol','{"type": "object", "description": "시음회 한 회차 등록 요청", "x-form-style": "tasting-form", "properties": {"eventDate": {"type": "string", "format": "date", "x-display-name": "시음회 날짜", "example": "2026-05-15"}, "startTime": {"type": "string", "x-display-name": "시작 시간", "example": "19:30:00"}, "endTime": {"type": "string", "x-display-name": "종료 시간", "example": "22:00:00"}, "eventNotes": {"type": "array", "items": {"type": "string"}, "maxItems": 4, "x-display-name": "비고 (일시)", "description": "일시 영역 추가 비고 (최대 4)", "x-field-style": "notes-list"}, "venueName": {"type": "string", "x-display-name": "바(장소) 이름", "example": "오가닉 바, 성수"}, "venueAddress": {"type": "string", "x-display-name": "바 위치(주소)", "example": "서울 성동구 연무장7길 11, 2F"}, "venueLat": {"type": "number", "format": "double", "x-display-name": "위도"}, "venueLng": {"type": "number", "format": "double", "x-display-name": "경도"}, "venueNotes": {"type": "array", "items": {"type": "string"}, "maxItems": 4, "x-display-name": "비고 (장소)", "description": "장소 영역 추가 비고 (최대 4)", "x-field-style": "notes-list"}, "entryFee": {"type": "integer", "minimum": 0, "x-display-name": "참가비 (원)", "example": 75000}, "capacity": {"type": "integer", "minimum": 1, "x-display-name": "정원", "example": 20}, "feeNotes": {"type": "array", "items": {"type": "string"}, "maxItems": 4, "x-display-name": "비고 (참가비·정원)", "description": "참가비·정원 영역 추가 비고 (최대 4)", "x-field-style": "notes-list"}, "alcohols": {"type": "array", "minItems": 1, "x-display-name": "시음 위스키", "description": "시음 위스키 카드 (각 카드: 위스키 1 + 코멘트). 위스키 목록 추천과 동일 형태.", "x-field-style": "alcohol-card-list", "items": {"type": "object", "properties": {"alcoholId": {"type": "integer", "format": "int64"}, "comment": {"type": "string"}}, "required": ["alcoholId"]}}}, "required": ["eventDate", "startTime", "venueName", "venueAddress", "entryFee", "capacity", "alcohols"], "x-container": "object"}','{"type": "object", "x-form-style": "tasting-form", "properties": {"eventDate": {"type": "string", "format": "date"}, "startTime": {"type": "string", "format": "time"}, "endTime": {"type": "string", "format": "time"}, "eventNotes": {"type": "array", "items": {"type": "string"}, "x-field-style": "notes-list"}, "venueName": {"type": "string"}, "venueAddress": {"type": "string"}, "venueLat": {"type": "number"}, "venueLng": {"type": "number"}, "venueNotes": {"type": "array", "items": {"type": "string"}, "x-field-style": "notes-list"}, "entryFee": {"type": "integer"}, "capacity": {"type": "integer"}, "feeNotes": {"type": "array", "items": {"type": "string"}, "x-field-style": "notes-list"}, "currentAttendees": {"type": "integer", "nullable": true}, "alcohols": {"type": "array", "x-field-style": "alcohol-card-list", "items": {"type": "object"}}}, "required": ["eventDate", "startTime", "venueName", "venueAddress", "entryFee", "capacity", "alcohols"]}');

-- ----- 2) 샘플 큐레이션 4건 -----

-- ALCOHOL_LIST 샘플
INSERT INTO curation (spec_id, name, description, cover_image_url, display_order, is_active)
  SELECT id, '가을 위스키', '셰리 캐스크 위주 추천', NULL, 0, 1
  FROM curation_spec WHERE code = 'ALCOHOL_LIST';
INSERT INTO curation_extension (curation_id, spec_id, payload)
  SELECT c.id, c.spec_id, '[{"alcoholId": 1, "comment": "진한 셰리"}, {"alcoholId": 5, "comment": "가벼운 바디"}]'
  FROM curation c
  WHERE c.spec_id = (SELECT id FROM curation_spec WHERE code = 'ALCOHOL_LIST')
  ORDER BY c.id DESC LIMIT 1;

-- PAIRING_LIST 샘플
INSERT INTO curation (spec_id, name, description, cover_image_url, display_order, is_active)
  SELECT id, '여름밤 페어링', '음식별 페어링 카드', NULL, 0, 1
  FROM curation_spec WHERE code = 'PAIRING_LIST';
INSERT INTO curation_extension (curation_id, spec_id, payload)
  SELECT c.id, c.spec_id, '[{"itemName": "다크 초콜릿 70%", "alcoholIds": [1, 5], "pairingNote": "피트와 카카오"}, {"itemName": "훈제 연어", "alcoholIds": [1], "pairingNote": "오일리한 지방"}]'
  FROM curation c
  WHERE c.spec_id = (SELECT id FROM curation_spec WHERE code = 'PAIRING_LIST')
  ORDER BY c.id DESC LIMIT 1;

-- PAIRING_MATRIX 샘플
INSERT INTO curation (spec_id, name, description, cover_image_url, display_order, is_active)
  SELECT id, '여름밤 매트릭스', '위스키 ↔ 음식 매트릭스', NULL, 0, 1
  FROM curation_spec WHERE code = 'PAIRING_MATRIX';
INSERT INTO curation_extension (curation_id, spec_id, payload)
  SELECT c.id, c.spec_id, '{"primaryAxis": "ALCOHOL_TO_ITEM", "items": [{"itemId": "item-1", "name": "다크 초콜릿"}, {"itemId": "item-2", "name": "훈제 연어"}], "alcoholIds": [1, 5], "links": [{"alcoholId": 1, "itemId": "item-1"}, {"alcoholId": 5, "itemId": "item-2"}]}'
  FROM curation c
  WHERE c.spec_id = (SELECT id FROM curation_spec WHERE code = 'PAIRING_MATRIX')
  ORDER BY c.id DESC LIMIT 1;

-- TASTING_V1 샘플
INSERT INTO curation (spec_id, name, description, cover_image_url, display_order, is_active)
  SELECT id, '오가닉 바 5월 시음회', '5월 정기 시음회', NULL, 0, 1
  FROM curation_spec WHERE code = 'TASTING_V1';
INSERT INTO curation_extension (curation_id, spec_id, payload)
  SELECT c.id, c.spec_id, '{"eventDate": "2026-05-15", "startTime": "19:30:00", "endTime": "22:00:00", "eventNotes": ["우천 시 1주 연기"], "venueName": "오가닉 바, 성수", "venueAddress": "서울 성동구 연무장7길 11, 2F", "venueLat": 37.544, "venueLng": 127.0557, "venueNotes": ["2층 직접 입장"], "entryFee": 75000, "capacity": 20, "feeNotes": ["환불 D-3까지"], "alcohols": [{"alcoholId": 1, "comment": "오프닝"}, {"alcoholId": 5, "comment": "마무리"}]}'
  FROM curation c
  WHERE c.spec_id = (SELECT id FROM curation_spec WHERE code = 'TASTING_V1')
  ORDER BY c.id DESC LIMIT 1;

