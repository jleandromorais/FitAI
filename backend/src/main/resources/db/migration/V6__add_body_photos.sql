-- V6: Fotos de evolução física por grupo muscular
CREATE TABLE IF NOT EXISTS body_photos (
    id            BIGSERIAL    PRIMARY KEY,
    user_id       BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    muscle_group  VARCHAR(50)  NOT NULL,
    photo_url     TEXT         NOT NULL,
    captured_at   DATE         NOT NULL DEFAULT CURRENT_DATE
);

CREATE INDEX IF NOT EXISTS idx_body_photos_user_date
    ON body_photos(user_id, captured_at DESC);
