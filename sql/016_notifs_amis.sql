-- Jalon 16 : centre de notifications et amis. À importer après 015_rgpd.sql.
SET NAMES utf8mb4;

-- Boîte de réception : tout ce qui concerne le joueur (score à confirmer, défi reçu, demande d'ami...).
-- Les alertes générales (événements bonus) restent seulement des notifications sur le téléphone.
CREATE TABLE IF NOT EXISTS notifications (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  kind VARCHAR(30) NOT NULL,
  title VARCHAR(120) NOT NULL,
  body VARCHAR(300) NOT NULL,
  url VARCHAR(120) NULL,
  actor_id INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY ix_notifications_user (user_id, id),
  KEY ix_notifications_unread (user_id, read_at),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_actor FOREIGN KEY (actor_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Amitiés : une ligne par paire, du demandeur vers l'autre joueur.
CREATE TABLE IF NOT EXISTS friendships (
  requester_id INT UNSIGNED NOT NULL,
  addressee_id INT UNSIGNED NOT NULL,
  status ENUM('pending', 'accepted') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  accepted_at DATETIME NULL,
  PRIMARY KEY (requester_id, addressee_id),
  KEY ix_friendships_addressee (addressee_id, status),
  CONSTRAINT fk_friendships_requester FOREIGN KEY (requester_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_friendships_addressee FOREIGN KEY (addressee_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Statut visible par les amis : dernière activité dans l'appli, et le choix de le montrer ou non.
ALTER TABLE users
  ADD COLUMN last_seen_at DATETIME NULL,
  ADD COLUMN show_presence TINYINT(1) NOT NULL DEFAULT 1;
