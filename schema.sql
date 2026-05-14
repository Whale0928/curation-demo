-- ============================================================
-- curation_demo schema
--
-- 복제 순서:
--   1) schema.sql
--   2) schema.init.sql
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS curation_extension;
DROP TABLE IF EXISTS curation;
DROP TABLE IF EXISTS curation_spec;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS ratings;
DROP TABLE IF EXISTS picks;
DROP TABLE IF EXISTS alcohols_tasting_tags;
DROP TABLE IF EXISTS alcohols;
DROP TABLE IF EXISTS tasting_tags;
DROP TABLE IF EXISTS distilleries;
DROP TABLE IF EXISTS regions;

-- ============================================================
-- bottle-note read model snapshot schema
-- ============================================================

CREATE TABLE `regions` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '국가',
  `kor_name` varchar(255) NOT NULL COMMENT '국가 한글명',
  `eng_name` varchar(255) NOT NULL COMMENT '국가 영문명',
  `continent` varchar(255) DEFAULT NULL COMMENT '대륙',
  `description` varchar(255) DEFAULT NULL COMMENT '주석',
  `create_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '최초 생성일',
  `create_by` varchar(255) DEFAULT NULL COMMENT '최초 생성자',
  `last_modify_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '최종 생성일',
  `last_modify_by` varchar(255) DEFAULT NULL COMMENT '최종 생성자',
  `parent_id` bigint DEFAULT NULL COMMENT '상위 지역 ID',
  `sort_order` int NOT NULL DEFAULT '9999' COMMENT '정렬 순서 (미설정: 9999)',
  PRIMARY KEY (`id`),
  KEY `idx_regions_parent_id` (`parent_id`)
) ENGINE=InnoDB AUTO_INCREMENT=101 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='국가';

CREATE TABLE `distilleries` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '증류소',
  `kor_name` varchar(255) NOT NULL COMMENT '증류소 한글 이름',
  `eng_name` varchar(255) NOT NULL COMMENT '증류소 영문 이름',
  `logo_img_url` varchar(255) DEFAULT NULL COMMENT '로고 이미지',
  `create_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '최초 생성일',
  `create_by` varchar(255) DEFAULT NULL COMMENT '최초 생성자',
  `last_modify_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '최종 생성일',
  `last_modify_by` varchar(255) DEFAULT NULL COMMENT '최종 생성자',
  `description` text,
  `sort_order` int NOT NULL DEFAULT '9999' COMMENT '정렬 순서 (미설정: 9999)',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10001 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='증류소';

CREATE TABLE `alcohols` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '술',
  `kor_name` varchar(255) NOT NULL COMMENT '한글 이름',
  `eng_name` varchar(255) NOT NULL COMMENT '영문 이름',
  `abv` varchar(255) DEFAULT NULL COMMENT '도수',
  `type` varchar(255) NOT NULL COMMENT '위스키 고정 ( 추후 럼,진등으로 확장 가능)',
  `kor_category` varchar(255) NOT NULL COMMENT '위스키, 럼, 브랜디의 하위상세 카테고리 한글명',
  `eng_category` varchar(255) NOT NULL COMMENT '위스키, 럼, 브랜디의 하위상세 카테고리 영문명 ',
  `category_group` varchar(255) NOT NULL COMMENT '하위 카테고리 그룹',
  `region_id` bigint DEFAULT NULL COMMENT 'https://www.data.go.kr/data/15076566/fileData.do?recommendDataYn=Y',
  `distillery_id` bigint DEFAULT NULL COMMENT '증류소 정보',
  `age` varchar(255) DEFAULT NULL COMMENT '숙성년도',
  `cask` varchar(255) DEFAULT NULL COMMENT '캐스트 타입(단순 문자열로 박기) - 한글 정제화가 힘들 수 있음. 영문사용 권장',
  `image_url` varchar(255) DEFAULT NULL COMMENT '썸네일 이미지',
  `create_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '최초 생성일',
  `create_by` varchar(255) DEFAULT NULL COMMENT '최초 생성자',
  `last_modify_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '최종 생성일',
  `last_modify_by` varchar(255) DEFAULT NULL COMMENT '최종 생성자',
  `description` text COMMENT '기본 설명',
  `volume` varchar(255) DEFAULT NULL COMMENT '용량',
  `deleted_at` timestamp NULL DEFAULT NULL COMMENT '삭제일시',
  PRIMARY KEY (`id`),
  KEY `region_id` (`region_id`),
  KEY `distillery_id` (`distillery_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8289 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='술';

CREATE TABLE `tasting_tags` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '테이스팅 태그',
  `kor_name` varchar(255) NOT NULL COMMENT '한글 태그 이름',
  `eng_name` varchar(255) NOT NULL COMMENT '영문 태그 이름',
  `icon` mediumtext COMMENT '아이콘 (Base64 이미지)',
  `description` varchar(255) DEFAULT NULL COMMENT '태그 설명',
  `parent_id` bigint DEFAULT NULL COMMENT '부모 태그 ID (자기참조, null이면 root)',
  `create_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '최초 생성일',
  `create_by` varchar(255) DEFAULT NULL COMMENT '최초 생성자',
  `last_modify_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '최종 생성일',
  `last_modify_by` varchar(255) DEFAULT NULL COMMENT '최종 생성자',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tasting_tags_kor_name` (`kor_name`),
  KEY `parent_id` (`parent_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1426 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='테이스팅 태그';

CREATE TABLE `alcohols_tasting_tags` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '술/테이스팅 태그 연관관계 해소',
  `alcohol_id` bigint NOT NULL COMMENT '술 아이디',
  `tasting_tag_id` bigint NOT NULL COMMENT '태그 아이디',
  `create_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '최초 생성일',
  `last_modify_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '최종 생성일',
  PRIMARY KEY (`id`),
  KEY `alcohols_tasting_tags_ibfk_1` (`alcohol_id`),
  KEY `alcohols_tasting_tags_ibfk_2` (`tasting_tag_id`)
) ENGINE=InnoDB AUTO_INCREMENT=86717 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='술/테이스팅 태그 연관관계 해소';

-- ============================================================
-- demo user/review/rating/pick schema
-- ============================================================

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

-- ============================================================
-- curation schema
-- ============================================================

-- ------------------------------------------------------------
-- curation_spec (양식지 = 동적 타입)
-- ------------------------------------------------------------
CREATE TABLE curation_spec
(
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    code            VARCHAR(64)  NOT NULL UNIQUE COMMENT '스펙 코드 (DEFAULT, PAIRING, TASTING_V1...)',
    name            VARCHAR(255) NOT NULL COMMENT '표시명',
    description     TEXT         NULL,
    request_spec    JSON         NOT NULL COMMENT 'OpenAPI 3.0 requestSpec',
    response_spec   JSON         NOT NULL COMMENT 'OpenAPI 3.0 responseSpec (서버 자동 생성)',
    hydrator_key    VARCHAR(64)  NOT NULL COMMENT '서버 측 hydrator 식별자 (alcohol, food, ...)',
    version         INT          NOT NULL DEFAULT 1,
    is_active       TINYINT(1)   NOT NULL DEFAULT 1,
    create_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_modify_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT '큐레이션 스펙';

-- ------------------------------------------------------------
-- curation (큐레이션 본체)
-- ------------------------------------------------------------
CREATE TABLE curation
(
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    spec_id         BIGINT       NOT NULL,
    name            VARCHAR(255) NOT NULL,
    description     TEXT         NULL,
    cover_image_url VARCHAR(500) NULL,
    image_url_2     VARCHAR(500) NULL,
    image_url_3     VARCHAR(500) NULL,
    exposure_start_date DATE     NULL,
    exposure_end_date   DATE     NULL,
    display_order   INT          NOT NULL DEFAULT 0,
    is_active       TINYINT(1)   NOT NULL DEFAULT 1,
    create_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_modify_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_curation_spec FOREIGN KEY (spec_id) REFERENCES curation_spec (id)
) COMMENT '큐레이션 본체';

-- ------------------------------------------------------------
-- curation_extension (1:1 확장 payload)
-- ------------------------------------------------------------
CREATE TABLE curation_extension
(
    curation_id     BIGINT      NOT NULL PRIMARY KEY,
    spec_id         BIGINT      NOT NULL,
    payload         JSON        NOT NULL COMMENT 'requestSpec을 통과한 데이터',
    create_at       TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_modify_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_extension_curation FOREIGN KEY (curation_id) REFERENCES curation (id) ON DELETE CASCADE,
    CONSTRAINT fk_extension_spec     FOREIGN KEY (spec_id)     REFERENCES curation_spec (id)
) COMMENT '큐레이션 확장 payload';

SET FOREIGN_KEY_CHECKS = 1;
