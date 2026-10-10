-- Jalon 4 : défis entre équipes. À importer après 004_personnalisation.sql.
-- Un défi porte soit sur un match existant (match_id), soit sur un créneau proposé (starts_at, venue_id, format).
CREATE TABLE IF NOT EXISTS challenges (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  from_team_id INT UNSIGNED NOT NULL,
  to_team_id INT UNSIGNED NOT NULL,
  created_by INT UNSIGNED NOT NULL,
  match_id INT UNSIGNED NULL,
  venue_id INT UNSIGNED NULL,
  format ENUM('city5', 'futsal', 'foot8', 'foot11') NULL,
  starts_at DATETIME NULL,
  duration_min SMALLINT UNSIGNED NOT NULL DEFAULT 60,
  message VARCHAR(300) NULL,
  status ENUM('pending', 'accepted', 'declined', 'cancelled') NOT NULL DEFAULT 'pending',
  response_message VARCHAR(300) NULL,
  responded_by INT UNSIGNED NULL,
  responded_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_challenges_to (to_team_id, status),
  KEY ix_challenges_from (from_team_id, status),
  CONSTRAINT fk_challenges_from FOREIGN KEY (from_team_id) REFERENCES teams (id) ON DELETE CASCADE,
  CONSTRAINT fk_challenges_to FOREIGN KEY (to_team_id) REFERENCES teams (id) ON DELETE CASCADE,
  CONSTRAINT fk_challenges_user FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_challenges_match FOREIGN KEY (match_id) REFERENCES matches (id) ON DELETE SET NULL,
  CONSTRAINT fk_challenges_venue FOREIGN KEY (venue_id) REFERENCES venues (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
