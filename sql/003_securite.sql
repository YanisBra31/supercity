-- Jalon 2 : sécurité des comptes (date de naissance, CGU, vérification d'e-mail,
-- anti-force brute, mot de passe oublié). À importer après 002_core.sql.

ALTER TABLE users
  ADD COLUMN birth_date DATE NULL AFTER display_name,
  ADD COLUMN terms_accepted_at DATETIME NULL AFTER avatar_url,
  ADD COLUMN email_verified_at DATETIME NULL AFTER terms_accepted_at;

-- Tentatives de connexion, d'inscription et de code : sert à limiter les essais.
CREATE TABLE IF NOT EXISTS auth_attempts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  kind ENUM('login', 'register', 'code', 'mail') NOT NULL,
  ip VARCHAR(45) NOT NULL,
  email VARCHAR(254) NULL,
  success TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_attempts_email (kind, email, created_at),
  KEY ix_attempts_ip (kind, ip, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Codes à 6 chiffres envoyés par e-mail (vérification, mot de passe oublié) : seul le hash est stocké.
CREATE TABLE IF NOT EXISTS email_codes (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  purpose ENUM('verify', 'reset') NOT NULL,
  code_hash CHAR(64) NOT NULL,
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_email_codes_user (user_id, purpose),
  CONSTRAINT fk_email_codes_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
