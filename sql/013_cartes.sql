-- Jalon 13 : cartes joueurs façon FUT. À importer après 012_boutique.sql.
-- Chaque joueur s'estime (1 à 5 étoiles par stat) ; les votes de ceux qui ont joué avec lui prennent le relais.
SET NAMES utf8mb4;
ALTER TABLE users
  ADD COLUMN card_stats VARCHAR(120) NULL,
  ADD COLUMN weak_foot TINYINT UNSIGNED NULL,
  ADD COLUMN skill_moves TINYINT UNSIGNED NULL;

-- Après un match : une note de 1 à 5 étoiles et, au choix, le point fort du joueur noté.
CREATE TABLE IF NOT EXISTS player_ratings (
  match_id INT UNSIGNED NOT NULL,
  rater_id INT UNSIGNED NOT NULL,
  rated_id INT UNSIGNED NOT NULL,
  stars TINYINT UNSIGNED NOT NULL,
  best ENUM('pac', 'sho', 'pas', 'dri', 'def', 'phy') NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (match_id, rater_id, rated_id),
  KEY ix_player_ratings_rated (rated_id),
  CONSTRAINT fk_player_ratings_match FOREIGN KEY (match_id) REFERENCES matches (id) ON DELETE CASCADE,
  CONSTRAINT fk_player_ratings_rater FOREIGN KEY (rater_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_player_ratings_rated FOREIGN KEY (rated_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
