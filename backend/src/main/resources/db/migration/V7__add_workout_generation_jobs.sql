CREATE TABLE IF NOT EXISTS workout_generation_jobs (
    id              BIGSERIAL    PRIMARY KEY,
    user_id         BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status          VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    request_params  TEXT         NOT NULL,
    result_json     TEXT,
    error_message   TEXT,
    created_at      TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workout_generation_jobs_user_created
    ON workout_generation_jobs(user_id, created_at DESC);
