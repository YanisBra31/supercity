-- Jalon 7 : rôles (modérateur, admin) et suspension de compte. À importer après 006_fil.sql.
ALTER TABLE users
  ADD COLUMN site_role ENUM('user', 'moderator', 'admin') NOT NULL DEFAULT 'user' AFTER accent,
  ADD COLUMN suspended_until DATETIME NULL AFTER site_role,
  ADD COLUMN suspended_reason VARCHAR(200) NULL AFTER suspended_until;

-- Pour devenir admin, une seule fois dans phpMyAdmin (remplacer l'adresse) :
-- UPDATE users SET site_role = 'admin' WHERE email = 'ton-adresse@exemple.fr';
