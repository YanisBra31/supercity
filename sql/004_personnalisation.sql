-- Jalon 3 : personnalisation des profils et des équipes. À importer après 003_securite.sql.

ALTER TABLE users
  ADD COLUMN bio VARCHAR(160) NULL AFTER display_name,
  ADD COLUMN shirt_number TINYINT UNSIGNED NULL AFTER strong_foot,
  ADD COLUMN favorite_club VARCHAR(60) NULL AFTER shirt_number,
  ADD COLUMN accent ENUM('orange', 'nuit', 'rouge', 'bleu', 'vert', 'violet') NOT NULL DEFAULT 'orange' AFTER favorite_club;

ALTER TABLE teams
  ADD COLUMN description VARCHAR(300) NULL AFTER city,
  ADD COLUMN color_primary CHAR(7) NOT NULL DEFAULT '#ff5223' AFTER logo_url,
  ADD COLUMN color_secondary CHAR(7) NOT NULL DEFAULT '#1f1a17' AFTER color_primary,
  ADD COLUMN founded_year SMALLINT UNSIGNED NULL AFTER usual_format,
  ADD COLUMN recruiting TINYINT(1) NOT NULL DEFAULT 0 AFTER founded_year;
