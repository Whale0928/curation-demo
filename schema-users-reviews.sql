-- ============================================================
-- users + reviews 도메인 (사용자/리뷰 hydrate 용)
--
-- 사전: schema-explore.sql 적재 (picks/ratings 테이블 + alcohol_id 1~10, user_id 1~5)
-- 실행:
--   docker exec -i mysql mysql -u bottle_note -p'bottle_note_1234' \
--     --default-character-set=utf8mb4 bottle_note < schema-users-reviews.sql
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
    rating         DOUBLE       NULL COMMENT '리뷰 자체에 매긴 별점 (선택)',
    create_at      TIMESTAMP    NULL DEFAULT CURRENT_TIMESTAMP,
    last_modify_at TIMESTAMP    NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    delete_at      TIMESTAMP    NULL DEFAULT NULL,
    KEY idx_alcohol_id (alcohol_id),
    KEY idx_user_id (user_id)
) COMMENT '술 리뷰';

-- ============================================================
-- 시드 데이터
-- ============================================================

INSERT INTO users (id, email, name) VALUES
    (1, 'whale@example.com',   '김고래'),
    (2, 'tiger@example.com',   '이호랑'),
    (3, 'sparrow@example.com', '박참새'),
    (4, 'whisky@example.com',  '최위스'),
    (5, 'malt@example.com',    '정몰트');

INSERT INTO reviews (alcohol_id, user_id, title, content, rating) VALUES
    (1, 1, '셰리 폭격',     '오로로소 캐스크의 진한 단맛이 인상적. 끝맛도 길게 남는다.', 4.5),
    (1, 2, '균형 잡힌 한 잔', '레드 헤드 라인업 중 가장 균형이 좋다.',                    4.0),
    (1, 3, '입문자에게도 OK','피트보다 단맛 위주라 부담 없음.',                          3.5),
    (1, 4, '베스트 픽',     '아일랜드 위스키 중 단연 최고.',                            5.0),
    (5, 1, '바닐라 향',     '버번 캐스크의 영향으로 바닐라가 강하게 올라온다.',         3.5),
    (5, 3, '데일리로 좋음', '가격 대비 만족도 높음.',                                  4.5),
    (7, 1, '풀바디',       '입에 꽉 차는 풍성함. 셰리 호불호 갈릴 듯.',                4.5),
    (8, 3, '오크 향',       '버건디 와인 캐스크 마무리 — 과실 향이 묵직하다.',          4.5);

SELECT 'users' AS tbl, COUNT(*) AS cnt FROM users
UNION ALL SELECT 'reviews', COUNT(*) FROM reviews;
