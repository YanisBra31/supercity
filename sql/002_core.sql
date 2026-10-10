-- Cœur de Supercity (jalon 1) : joueurs, connexions, équipes, terrains, matchs et inscriptions.
-- À importer dans phpMyAdmin après 001_waitlist.sql. Toutes les dates sont en UTC.

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(40) NOT NULL,
  city VARCHAR(80) NULL,
  position ENUM('gardien', 'defenseur', 'milieu', 'attaquant') NULL,
  level TINYINT UNSIGNED NULL COMMENT '1 (débutant) à 5 (confirmé)',
  strong_foot ENUM('droit', 'gauche', 'les_deux') NULL,
  avatar_url VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Jetons de connexion : seul le hash SHA-256 est stocké.
CREATE TABLE IF NOT EXISTS auth_tokens (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  last_used_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_auth_tokens_hash (token_hash),
  KEY ix_auth_tokens_user (user_id),
  CONSTRAINT fk_auth_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS teams (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(60) NOT NULL,
  city VARCHAR(80) NULL,
  logo_url VARCHAR(500) NULL,
  usual_format ENUM('city5', 'futsal', 'foot8', 'foot11') NULL,
  captain_id INT UNSIGNED NOT NULL,
  invite_code CHAR(8) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_teams_invite_code (invite_code),
  KEY ix_teams_name (name),
  CONSTRAINT fk_teams_captain FOREIGN KEY (captain_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS team_members (
  team_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  role ENUM('captain', 'player') NOT NULL DEFAULT 'player',
  joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (team_id, user_id),
  KEY ix_team_members_user (user_id),
  CONSTRAINT fk_team_members_team FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
  CONSTRAINT fk_team_members_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS venues (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  address VARCHAR(255) NOT NULL,
  city VARCHAR(80) NULL,
  lat DECIMAL(9, 6) NOT NULL,
  lng DECIMAL(9, 6) NOT NULL,
  surface ENUM('city', 'synthetique', 'herbe', 'parquet', 'autre') NOT NULL DEFAULT 'autre',
  covered TINYINT(1) NOT NULL DEFAULT 0,
  created_by INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_venues_geo (lat, lng),
  CONSTRAINT fk_venues_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS matches (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  organizer_id INT UNSIGNED NOT NULL,
  venue_id INT UNSIGNED NOT NULL,
  format ENUM('city5', 'futsal', 'foot8', 'foot11') NOT NULL,
  starts_at DATETIME NOT NULL,
  duration_min SMALLINT UNSIGNED NOT NULL DEFAULT 60,
  max_players SMALLINT UNSIGNED NOT NULL,
  level TINYINT UNSIGNED NULL COMMENT 'niveau visé, 1 à 5',
  home_team_id INT UNSIGNED NULL,
  away_team_id INT UNSIGNED NULL,
  status ENUM('open', 'full', 'cancelled') NOT NULL DEFAULT 'open',
  visibility ENUM('public', 'private') NOT NULL DEFAULT 'public',
  description VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_matches_search (visibility, status, starts_at),
  KEY ix_matches_venue (venue_id),
  CONSTRAINT fk_matches_organizer FOREIGN KEY (organizer_id) REFERENCES users (id),
  CONSTRAINT fk_matches_venue FOREIGN KEY (venue_id) REFERENCES venues (id),
  CONSTRAINT fk_matches_home FOREIGN KEY (home_team_id) REFERENCES teams (id) ON DELETE SET NULL,
  CONSTRAINT fk_matches_away FOREIGN KEY (away_team_id) REFERENCES teams (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS match_participants (
  match_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  team_id INT UNSIGNED NULL,
  status ENUM('registered', 'waitlist', 'withdrawn') NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (match_id, user_id),
  KEY ix_match_participants_user (user_id),
  KEY ix_match_participants_queue (match_id, status, updated_at),
  CONSTRAINT fk_match_participants_match FOREIGN KEY (match_id) REFERENCES matches (id) ON DELETE CASCADE,
  CONSTRAINT fk_match_participants_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_match_participants_team FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
