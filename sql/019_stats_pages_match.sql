-- Jalon 19 : combien de visites et d'inscriptions rapporte chaque lien de match partagé (/m/<id>), et d'où elles viennent.
-- À importer après 018_paiement_au_coup_d_envoi.sql. Uniquement des compteurs par jour : ni adresse IP, ni joueur, ni cookie.
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS match_page_stats (
  day DATE NOT NULL,
  match_id INT UNSIGNED NOT NULL,
  -- D'où vient le visiteur : le paramètre ?src= du lien (tiktok, insta, affiche…), « direct » sans paramètre.
  src VARCHAR(24) NOT NULL,
  views INT UNSIGNED NOT NULL DEFAULT 0,
  -- Comptes créés depuis la page, puis inscriptions au match.
  accounts INT UNSIGNED NOT NULL DEFAULT 0,
  joins INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (day, match_id, src),
  KEY ix_match_page_stats_match (match_id),
  CONSTRAINT fk_match_page_stats_match FOREIGN KEY (match_id) REFERENCES matches (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
