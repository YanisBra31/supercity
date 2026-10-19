// Moments de fête : pluie de confettis et bandeau « C'est validé » par-dessus la page, après une action réussie
// (inscription, match publié, notes envoyées…). Aucun composant à monter : tout est ajouté puis retiré du document.
const COLORS = ['#ff9417', '#ff5223', '#ffd54f', '#fff8f1', '#2e9d4f', '#29b6f6'];
const PIECES = 42;

export function celebrate({ title, text }: { title: string; text?: string }) {
  document.querySelector('.party')?.remove();
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.createElement('div');
  root.className = 'party';
  root.setAttribute('role', 'status');
  if (!reduce) {
    for (let i = 0; i < PIECES; i++) {
      const c = document.createElement('i');
      const w = 7 + Math.random() * 6;
      const round = Math.random() > 0.7;
      c.style.cssText = [
        `left:${Math.random() * 100}%`,
        `width:${w}px`,
        `height:${round ? w : w * 1.6}px`,
        `border-radius:${round ? '50%' : '2px'}`,
        `background:${COLORS[i % COLORS.length]}`,
        `animation-delay:${Math.random() * 0.4}s`,
        `--drift:${(Math.random() - 0.5) * 140}px`,
        `--spin:${(Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 540)}deg`,
      ].join(';');
      root.appendChild(c);
    }
  }
  const toast = document.createElement('div');
  toast.className = 'party__toast';
  const b = document.createElement('b');
  b.textContent = title;
  toast.appendChild(b);
  if (text) {
    const s = document.createElement('span');
    s.textContent = text;
    toast.appendChild(s);
  }
  root.appendChild(toast);
  document.body.appendChild(root);
  setTimeout(() => root.remove(), 2800);
}
