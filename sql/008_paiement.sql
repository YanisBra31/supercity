-- Jalon 8 : paiement de la place (prix par joueur, comptes Stripe des organisateurs, paiements). À importer après 007_roles.sql.

ALTER TABLE users
  ADD stripe_account_id VARCHAR(64) NULL AFTER suspended_reason,
  ADD stripe_ready TINYINT(1) NOT NULL DEFAULT 0 AFTER stripe_account_id;

-- 0 = match gratuit. Le joueur paie ce prix plus les frais de service Supercity.
ALTER TABLE matches
  ADD price_cents INT UNSIGNED NOT NULL DEFAULT 0 AFTER max_players;

-- « pending » : place réservée en attendant le paiement, jusqu'à hold_until.
ALTER TABLE match_participants
  MODIFY status ENUM('registered', 'waitlist', 'withdrawn', 'pending') NOT NULL,
  ADD hold_until DATETIME NULL AFTER status;

CREATE TABLE IF NOT EXISTS payments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  match_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  session_id VARCHAR(255) NOT NULL,
  payment_intent VARCHAR(255) NULL,
  amount_cents INT UNSIGNED NOT NULL,
  fee_cents INT UNSIGNED NOT NULL,
  status ENUM('open', 'paid', 'refunded', 'expired') NOT NULL DEFAULT 'open',
  refund_cents INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at DATETIME NULL,
  refunded_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY ux_payments_session (session_id),
  KEY ix_payments_match_user (match_id, user_id, status),
  CONSTRAINT fk_payments_match FOREIGN KEY (match_id) REFERENCES matches (id) ON DELETE CASCADE,
  CONSTRAINT fk_payments_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
