-- Jalon 11 : notifications sur les téléphones (événements bonus, séries sur les terrains proches, scores à confirmer).
-- À importer après 010_series.sql.
CREATE TABLE IF NOT EXISTS push_tokens (
  token VARCHAR(200) NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  platform ENUM('ios', 'android') NOT NULL,
  -- Position approchée (à 1 km près) pour les alertes des terrains proches.
  lat DECIMAL(6, 2) NULL,
  lng DECIMAL(6, 2) NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (token),
  KEY ix_push_tokens_user (user_id),
  KEY ix_push_tokens_geo (lat, lng),
  CONSTRAINT fk_push_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE users
  ADD COLUMN notify_events TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN notify_streaks TINYINT(1) NOT NULL DEFAULT 1;

ALTER TABLE bonus_events ADD COLUMN notified_at DATETIME NULL;

-- Séries déjà annoncées : une alerte par match qui fait passer un palier (3, 5, 10 victoires...).
CREATE TABLE IF NOT EXISTS streak_alerts (
  match_id INT UNSIGNED NOT NULL,
  team_id INT UNSIGNED NOT NULL,
  streak SMALLINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (match_id, team_id),
  CONSTRAINT fk_streak_alerts_match FOREIGN KEY (match_id) REFERENCES matches (id) ON DELETE CASCADE,
  CONSTRAINT fk_streak_alerts_team FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
