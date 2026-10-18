-- Jalon 17 : inviter ses amis, rappel avant le match, matchs des amis, discussions. À importer après 016_notifs_amis.sql.
SET NAMES utf8mb4;

-- Invitations à un match : une seule par joueur et par match, pour éviter d'insister.
CREATE TABLE IF NOT EXISTS match_invites (
  match_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  invited_by INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (match_id, user_id),
  KEY ix_match_invites_by (invited_by),
  CONSTRAINT fk_match_invites_match FOREIGN KEY (match_id) REFERENCES matches (id) ON DELETE CASCADE,
  CONSTRAINT fk_match_invites_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_match_invites_by FOREIGN KEY (invited_by) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Discussions d'un match (joueurs inscrits) ou d'une équipe (membres).
CREATE TABLE IF NOT EXISTS chat_messages (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  scope ENUM('match', 'team') NOT NULL,
  scope_id INT UNSIGNED NOT NULL,
  author_id INT UNSIGNED NOT NULL,
  body VARCHAR(500) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_chat_messages_scope (scope, scope_id, id),
  KEY ix_chat_messages_author (author_id, created_at),
  CONSTRAINT fk_chat_messages_author FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ce que chaque joueur a lu dans chaque discussion, et quand on l'a prévenu pour la dernière fois.
CREATE TABLE IF NOT EXISTS chat_reads (
  user_id INT UNSIGNED NOT NULL,
  scope ENUM('match', 'team') NOT NULL,
  scope_id INT UNSIGNED NOT NULL,
  last_read_id INT UNSIGNED NOT NULL DEFAULT 0,
  pushed_at DATETIME NULL,
  PRIMARY KEY (user_id, scope, scope_id),
  CONSTRAINT fk_chat_reads_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tâches de fond lancées au plus une fois par minute, quel que soit le nombre de joueurs connectés.
CREATE TABLE IF NOT EXISTS job_runs (
  name VARCHAR(40) NOT NULL,
  ran_at DATETIME NOT NULL,
  PRIMARY KEY (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Rappel 2 h avant le match, envoyé une seule fois.
ALTER TABLE matches
  ADD COLUMN reminded_at DATETIME NULL;

-- Être prévenu quand un ami organise ou rejoint un match.
ALTER TABLE users
  ADD COLUMN notify_friends TINYINT(1) NOT NULL DEFAULT 1;
