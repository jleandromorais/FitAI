-- V8: Medidas corporais e metas de peso — fatia fina espelhando V6 (body_photos).
-- "Meta atingida" NUNCA vira coluna: é derivada das medidas reais na leitura
-- (BodyWeightGoalService.evaluate) — Regra da Honestidade do Painel (DESIGN.md).
--
-- Colunas de peso/altura/BF em DOUBLE PRECISION (não NUMERIC): as entidades
-- usam Double e o projeto roda com spring.jpa.hibernate.ddl-auto=validate —
-- mesma escolha de `weight`/`prev` (V1) e `total_volume` (V4). `created_at`
-- em TIMESTAMP (sem tz), como `refresh_token_expiry`/`reset_token_expiry`
-- (V2/V3), que também são campos Instant. As faixas (20–500 kg etc.) são
-- garantidas pelo Bean Validation nas DTOs de request.

CREATE TABLE IF NOT EXISTS body_measurements (
    id            BIGSERIAL         PRIMARY KEY,
    user_id       BIGINT            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    measured_at   DATE              NOT NULL DEFAULT CURRENT_DATE,
    weight_kg     DOUBLE PRECISION  NOT NULL,
    height_cm     DOUBLE PRECISION,
    body_fat_pct  DOUBLE PRECISION,
    note          VARCHAR(280)
);

CREATE INDEX IF NOT EXISTS idx_body_measurements_user_date
    ON body_measurements(user_id, measured_at DESC);

CREATE TABLE IF NOT EXISTS body_weight_goals (
    id                BIGSERIAL         PRIMARY KEY,
    user_id           BIGINT            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_weight_kg  DOUBLE PRECISION  NOT NULL,
    target_date       DATE,
    created_at        TIMESTAMP         NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_body_weight_goals_user_created
    ON body_weight_goals(user_id, created_at DESC);
