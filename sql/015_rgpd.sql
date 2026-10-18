-- Jalon 15 : suppression de compte (RGPD). À importer après 014_grade_bonus.sql.
-- Un compte supprimé est anonymisé : plus d'e-mail, de nom ni de photo, mais l'historique des matchs
-- des autres joueurs et la comptabilité des paiements restent cohérents.
SET NAMES utf8mb4;
ALTER TABLE users
  ADD COLUMN deleted_at DATETIME NULL;

-- Demandes de copie des données, limitées comme les autres envois d'e-mails.
ALTER TABLE auth_attempts
  MODIFY kind ENUM('login', 'register', 'code', 'mail', 'export') NOT NULL;
