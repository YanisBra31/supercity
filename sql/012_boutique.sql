-- Jalon 12 : boutique de cosmétiques (cadres, bannières, titres) et pièces. À importer après 011_notifications.sql.
-- Les pièces gagnées viennent des points de grade (calculés) ; ce journal garde les dépenses et, plus tard, les achats.
SET NAMES utf8mb4;
CREATE TABLE IF NOT EXISTS cosmetics (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  type ENUM('frame', 'banner', 'title') NOT NULL,
  name VARCHAR(40) NOT NULL,
  rarity ENUM('common', 'rare', 'epic', 'legendary') NOT NULL DEFAULT 'common',
  price INT UNSIGNED NOT NULL DEFAULT 0,
  -- Apparence : couleurs, effet du cadre ou motif de la bannière (JSON).
  look VARCHAR(500) NOT NULL,
  -- Grade minimum (1 Rookie ... 6 Légende) pour l'obtenir.
  min_level TINYINT UNSIGNED NULL,
  -- Collection saisonnière : en vente seulement entre starts_at et ends_at.
  collection VARCHAR(40) NULL,
  starts_at DATETIME NULL,
  ends_at DATETIME NULL,
  retired TINYINT(1) NOT NULL DEFAULT 0,
  created_by INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_cosmetics_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_cosmetics (
  user_id INT UNSIGNED NOT NULL,
  cosmetic_id INT UNSIGNED NOT NULL,
  acquired_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, cosmetic_id),
  CONSTRAINT fk_user_cosmetics_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_user_cosmetics_cosmetic FOREIGN KEY (cosmetic_id) REFERENCES cosmetics (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS coin_ledger (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  amount INT NOT NULL,
  reason ENUM('purchase', 'grant', 'topup') NOT NULL,
  cosmetic_id INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_coin_ledger_user (user_id),
  CONSTRAINT fk_coin_ledger_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_coin_ledger_cosmetic FOREIGN KEY (cosmetic_id) REFERENCES cosmetics (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE users
  ADD COLUMN frame_id INT UNSIGNED NULL,
  ADD COLUMN banner_id INT UNSIGNED NULL,
  ADD COLUMN title_id INT UNSIGNED NULL,
  ADD CONSTRAINT fk_users_frame FOREIGN KEY (frame_id) REFERENCES cosmetics (id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_users_banner FOREIGN KEY (banner_id) REFERENCES cosmetics (id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_users_title FOREIGN KEY (title_id) REFERENCES cosmetics (id) ON DELETE SET NULL;

-- Catalogue de départ : toujours en vente, plus quelques pièces réservées aux meilleurs grades.
INSERT INTO cosmetics (type, name, rarity, price, look, min_level) VALUES
  ('frame', 'Supercity', 'common', 100, '{"colors":["#ff9417","#ff5223"],"effect":"none"}', NULL),
  ('frame', 'Craie', 'common', 100, '{"colors":["#fff8f1","#d7c7b8"],"effect":"none"}', NULL),
  ('frame', 'Néon', 'rare', 300, '{"colors":["#29b6f6","#7e57c2"],"effect":"glow"}', NULL),
  ('frame', 'Braise', 'epic', 700, '{"colors":["#ffd54f","#ff5223"],"effect":"glow"}', NULL),
  ('frame', 'Étoile', 'epic', 0, '{"colors":["#ff9417","#ec407a"],"effect":"spin"}', 5),
  ('frame', 'Couronne', 'legendary', 0, '{"colors":["#ffd54f","#c49000"],"effect":"spin"}', 6),
  ('banner', 'Coucher de soleil', 'common', 150, '{"colors":["#ff9417","#ec407a","#7e57c2"],"pattern":"none"}', NULL),
  ('banner', 'Béton', 'common', 150, '{"colors":["#9e9e9e","#5c524c"],"pattern":"dots"}', NULL),
  ('banner', 'Pelouse', 'rare', 300, '{"colors":["#66bb6a","#1b5e20"],"pattern":"stripes"}', NULL),
  ('banner', 'Brasier', 'epic', 800, '{"colors":["#ffd54f","#ff5223","#8e1b3a"],"pattern":"flames"}', NULL),
  ('title', 'Le Mur', 'common', 100, '{"colors":["#5c524c","#1f1a17"]}', NULL),
  ('title', 'Capitaine courage', 'common', 100, '{"colors":["#1e88e5","#0d2c6b"]}', NULL),
  ('title', 'Pichichi', 'rare', 250, '{"colors":["#2e9d4f","#1b5e20"]}', NULL),
  ('title', 'Roi du five', 'rare', 300, '{"colors":["#ff9417","#ff5223"]}', NULL),
  ('title', 'Magicien', 'epic', 600, '{"colors":["#ab47bc","#4527a0"]}', NULL),
  ('title', 'Légende du quartier', 'legendary', 0, '{"colors":["#ffd54f","#c49000"]}', 6);

-- Première collection saisonnière, jusqu'au début de l'hiver.
INSERT INTO cosmetics (type, name, rarity, price, look, collection, starts_at, ends_at) VALUES
  ('frame', 'Feuille d''automne', 'rare', 400, '{"colors":["#ff9417","#8e1b3a"],"effect":"glow"}', 'Saison d''automne', UTC_TIMESTAMP(), '2026-12-21 00:00:00'),
  ('banner', 'Nuit d''octobre', 'epic', 900, '{"colors":["#ff9417","#8e1b3a","#1f1a17"],"pattern":"dots"}', 'Saison d''automne', UTC_TIMESTAMP(), '2026-12-21 00:00:00'),
  ('title', 'Cueilleur de lucarnes', 'legendary', 1500, '{"colors":["#ffd54f","#8e1b3a"]}', 'Saison d''automne', UTC_TIMESTAMP(), '2026-12-21 00:00:00');
