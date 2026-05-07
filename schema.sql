-- ============================================================
-- curation_demo schema
--
-- 사전 import 필요: dev-snapshot.sql (regions, distilleries, alcohols 50건)
-- 본 파일은 큐레이션 3테이블 + 시드만 담당.
-- ============================================================

DROP TABLE IF EXISTS curation_extension;
DROP TABLE IF EXISTS curation;
DROP TABLE IF EXISTS curation_spec;

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

-- 시드 데이터는 스펙·큐레이션 정의 확정 후 추가 예정.
