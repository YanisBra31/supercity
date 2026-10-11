-- Jalon 10 : scores des matchs entre équipes (séries de victoires) et événements bonus créés par la modération.
-- À importer après 009_pro.sql.
ALTER TABLE matches
  ADD COLUMN home_score TINYINT UNSIGNED NULL AFTER away_team_id,
  ADD COLUMN away_score TINYINT UNSIGNED NULL AFTER home_score,
  ADD COLUMN score_status ENUM('reported', 'confirmed', 'disputed') NULL AFTER away_score,
  ADD COLUMN score_team_id INT UNSIGNED NULL AFTER score_status,
  ADD COLUMN score_at DATETIME NULL AFTER score_team_id,
  ADD KEY ix_matches_home_result (home_team_id, score_status),
  ADD KEY ix_matches_away_result (away_team_id, score_status);

CREATE TABLE IF NOT EXISTS bonus_events (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(60) NOT NULL,
  description VARCHAR(300) NULL,
  venue_id INT UNSIGNED NULL,
  multiplier TINYINT UNSIGNED NOT NULL DEFAULT 2,
  bonus_points SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NOT NULL,
  created_by INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_bonus_events_dates (ends_at, starts_at),
  CONSTRAINT fk_bonus_events_venue FOREIGN KEY (venue_id) REFERENCES venues (id) ON DELETE CASCADE,
  CONSTRAINT fk_bonus_events_user FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
