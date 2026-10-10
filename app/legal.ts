// Informations légales affichées dans les mentions légales et la politique de confidentialité.
// Les valeurs « À REMPLIR » doivent être complétées avant la mise en ligne.
export const SITE_URL = "https://supercity.fr";

export const legal = {
  // Éditeur du site : nom et prénom pour un particulier ou un auto-entrepreneur, raison sociale pour une société.
  editeur: "[À REMPLIR : nom et prénom ou raison sociale]",
  // Par exemple : « Particulier », « Entrepreneur individuel (micro-entreprise) », « SAS au capital de 1 000 € ».
  statut: "[À REMPLIR : statut]",
  // Numéro SIREN ou SIRET, ou null pour un particulier.
  siret: "[À REMPLIR : SIRET, ou supprimer la ligne]" as string | null,
  adresse: "[À REMPLIR : adresse postale]",
  email: "[À REMPLIR : e-mail de contact, par exemple contact@supercity.fr]",
  directeurPublication: "[À REMPLIR : nom et prénom]",
  derniereMiseAJour: "10 octobre 2026",
};

export const hebergeur = {
  nom: "Hostinger International Ltd",
  adresse: "61 Lordou Vironos Street, 6023 Larnaca, Chypre",
  site: "https://www.hostinger.fr",
};
