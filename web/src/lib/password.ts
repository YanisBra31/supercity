// Règles de mot de passe, identiques à celles de l'API (public/api/src/security.php).
const COMMON = [
  'motdepasse', 'password', 'azerty', 'azertyuiop', 'qwerty', 'qwertyuiop', 'soleil', 'bonjour', 'football',
  'foot', 'supercity', 'marseille', 'paris', 'psg', 'om', 'olympique', 'doudou', 'loulou', 'chouchou',
  'nicolas', 'julien', 'camille', 'coucou', 'iloveyou', 'jetaime', 'admin', 'welcome', 'abcdef', 'abc',
  'monkey', 'dragon', 'master', 'sunshine', 'princess', 'letmein', 'toulouse', 'lyon', 'zidane', 'messi', 'ronaldo',
];
export const PASSWORD_MIN = 10;

export type Rule = { label: string; ok: boolean };

export function passwordRules(password: string, personal: string[] = []): Rule[] {
  const lower = password.toLowerCase();
  const core = lower.replace(/[^\p{L}]/gu, '');
  const words = personal.map((w) => w.trim().toLowerCase()).filter((w) => w.length >= 3);
  return [
    { label: `${PASSWORD_MIN} caractères minimum`, ok: [...password].length >= PASSWORD_MIN },
    { label: 'Au moins une lettre', ok: /\p{L}/u.test(password) },
    { label: 'Au moins un chiffre', ok: /\d/.test(password) },
    { label: 'Pas un mot de passe courant', ok: password.length > 0 && !COMMON.includes(core) && !/^(.)\1+$/u.test(lower) },
    { label: 'Sans ton pseudo ni ton e-mail', ok: password.length > 0 && !words.some((w) => lower.includes(w)) },
  ];
}

// Score de 0 à 4 pour la jauge : règles respectées, plus un bonus pour la longueur et les symboles.
export function passwordScore(password: string, personal: string[] = []): number {
  if (!password) return 0;
  const rules = passwordRules(password, personal);
  if (!rules.every((r) => r.ok)) return Math.min(1, rules.filter((r) => r.ok).length >= 3 ? 1 : 0);
  let score = 2;
  if (password.length >= 14) score++;
  if (/[^\p{L}\d]/u.test(password) && /\p{Lu}/u.test(password)) score++;
  return score;
}

export const SCORE_LABELS = ['Trop faible', 'Faible', 'Correct', 'Solide', 'Excellent'];
