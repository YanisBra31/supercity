-- Jalon 14 : points de grade donnés (ou repris) par un admin. À importer après 013_cartes.sql.
-- Ils s'ajoutent aux points gagnés en jouant : le grade, et donc les pièces, suivent.
SET NAMES utf8mb4;
CREATE TABLE IF NOT EXISTS grade_bonus (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  amount INT NOT NULL,
  created_by INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_grade_bonus_user (user_id),
  CONSTRAINT fk_grade_bonus_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_grade_bonus_admin FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
