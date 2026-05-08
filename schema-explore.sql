-- ============================================================
-- 알코올 탐색용 — 별점 + 찜하기 도메인 (bottle-note 복제)
--
-- 사전: schema.sql + dev-snapshot.sql 적재 (alcohols 50건 등)
-- ============================================================

DROP TABLE IF EXISTS ratings;
DROP TABLE IF EXISTS picks;

-- ------------------------------------------------------------
-- ratings — 사용자별 알코올 평점 (복합키 alcohol_id + user_id)
-- ------------------------------------------------------------
CREATE TABLE ratings
(
    alcohol_id     BIGINT      NOT NULL COMMENT '평가 대상 술',
    user_id        BIGINT      NOT NULL COMMENT '평가자(사용자)',
    rating         DOUBLE      NOT NULL DEFAULT 0 COMMENT '0:삭제, 0.5:최저, 5:최고',
    create_at      TIMESTAMP   NULL DEFAULT CURRENT_TIMESTAMP,
    last_modify_at TIMESTAMP   NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    delete_at      TIMESTAMP   NULL DEFAULT NULL,
    PRIMARY KEY (alcohol_id, user_id),
    KEY idx_user_id (user_id)
) COMMENT '술 평점';

-- ------------------------------------------------------------
-- picks — 찜하기 (PICK / UNPICK 토글)
-- ------------------------------------------------------------
CREATE TABLE picks
(
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id        BIGINT       NOT NULL,
    alcohol_id     BIGINT       NOT NULL,
    status         VARCHAR(16)  NOT NULL COMMENT 'PICK / UNPICK',
    create_at      TIMESTAMP    NULL DEFAULT CURRENT_TIMESTAMP,
    last_modify_at TIMESTAMP    NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_user_id (user_id),
    KEY idx_alcohol_id (alcohol_id)
) COMMENT '찜하기';

-- ============================================================
-- 시드 데이터 (alcohol_id 1~10 위주, user_id 1~5)
-- ============================================================

INSERT INTO ratings (alcohol_id, user_id, rating) VALUES
    -- alcohol 1: avg 4.25
    (1, 1, 4.5), (1, 2, 4.0), (1, 3, 3.5), (1, 4, 5.0),
    -- alcohol 2: avg 3.83
    (2, 1, 3.0), (2, 2, 4.5), (2, 3, 4.0),
    -- alcohol 3: avg 4.0
    (3, 2, 4.0), (3, 3, 4.0),
    -- alcohol 4: avg 5.0
    (4, 1, 5.0),
    -- alcohol 5: avg 4.0
    (5, 1, 3.5), (5, 2, 4.0), (5, 3, 4.5), (5, 4, 4.0),
    -- alcohol 6: avg 3.5
    (6, 2, 3.0), (6, 3, 4.0),
    -- alcohol 7: avg 4.67
    (7, 1, 4.5), (7, 2, 4.5), (7, 4, 5.0),
    -- alcohol 8: avg 4.25
    (8, 1, 4.0), (8, 3, 4.5),
    -- alcohol 9: avg 3.0
    (9, 1, 3.0),
    -- alcohol 10: avg 4.5
    (10, 2, 4.5), (10, 3, 4.5);

INSERT INTO picks (user_id, alcohol_id, status) VALUES
    -- user 1: 1, 3, 5, 7
    (1, 1, 'PICK'),
    (1, 3, 'PICK'),
    (1, 5, 'PICK'),
    (1, 7, 'PICK'),
    -- user 2: 1, 2, 4
    (2, 1, 'PICK'),
    (2, 2, 'PICK'),
    (2, 4, 'PICK'),
    -- user 3: 1, 3, 8 (3 은 한 번 PICK 후 다시 UNPICK 후 재 PICK)
    (3, 1, 'PICK'),
    (3, 3, 'PICK'),
    (3, 8, 'PICK'),
    -- user 4: 7
    (4, 7, 'PICK'),
    -- user 1: alcohol 9 한 번 PICK 후 UNPICK
    (1, 9, 'PICK'),
    (1, 9, 'UNPICK');
