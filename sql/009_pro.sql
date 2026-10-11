-- Jalon 9 : espace pro (five, club, association, coach) et tournois. À importer après 008_paiement.sql.
-- Les matchs payants sont réservés aux organisations : elles encaissent via leur propre compte Stripe,
-- Supercity prend une commission sur le prix de chaque place, en plus des frais de service.

CREATE TABLE IF NOT EXISTS organizations (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_id INT UNSIGNED NOT NULL,
  name VARCHAR(80) NOT NULL,
  kind ENUM('five', 'club', 'association', 'coach', 'autre') NOT NULL,
  legal_form ENUM('company', 'non_profit', 'individual') NOT NULL COMMENT 'société, association, auto-entrepreneur',
  city VARCHAR(80) NULL,
  description VARCHAR(500) NULL,
  stripe_account_id VARCHAR(64) NULL,
  stripe_ready TINYINT(1) NOT NULL DEFAULT 0,
  commission_percent DECIMAL(4, 1) NULL COMMENT 'taux négocié ; vide = taux de supercity-config.php',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_organizations_owner (owner_id),
  KEY ix_organizations_stripe (stripe_account_id),
  CONSTRAINT fk_organizations_owner FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE matches
  ADD organization_id INT UNSIGNED NULL AFTER organizer_id,
  ADD kind ENUM('match', 'tournament') NOT NULL DEFAULT 'match' AFTER organization_id,
  ADD title VARCHAR(80) NULL AFTER kind,
  ADD KEY ix_matches_organization (organization_id, starts_at),
  ADD CONSTRAINT fk_matches_organization FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE SET NULL;

-- Part du prix gardée par Supercity (en plus de fee_cents, les frais de service payés par le joueur).
ALTER TABLE payments
  ADD commission_cents INT UNSIGNED NOT NULL DEFAULT 0 AFTER fee_cents;
