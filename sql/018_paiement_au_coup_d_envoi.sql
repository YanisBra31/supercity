-- Jalon 18 : le joueur n'est débité que si le match se joue complet. À importer après 017_invitations_discussions.sql.
-- À l'inscription, le montant est seulement bloqué sur sa carte (« authorized ») ; il est débité 2 h avant le coup d'envoi
-- si le match est complet, sinon le match est annulé et rien n'est débité (« canceled »).

ALTER TABLE payments
  MODIFY status ENUM('open', 'authorized', 'paid', 'refunded', 'expired', 'canceled') NOT NULL DEFAULT 'open',
  ADD authorized_at DATETIME NULL AFTER created_at,
  ADD canceled_at DATETIME NULL AFTER refunded_at;

-- Le blocage d'une carte ne dure que 7 jours : inscrit plus tôt, le joueur confirme sa carte à partir de J-6, avant J-4.
ALTER TABLE match_participants
  ADD card_reminded_at DATETIME NULL AFTER hold_until;

-- Moment où l'on a débité les joueurs (match complet) ou annulé le match (pas complet).
ALTER TABLE matches
  ADD payment_settled_at DATETIME NULL AFTER price_cents;
