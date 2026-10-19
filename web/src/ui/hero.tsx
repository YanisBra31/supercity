// Bandeau dégradé en tête de page (aide, espace pro, boutique) ; fond libre pour les bannières de profil.
import { ReactNode } from 'react';

export function Hero({ kicker, title, sub, background, children }: { kicker?: string; title?: string; sub?: ReactNode; background?: string; children?: ReactNode }) {
  return (
    <section className="hero" style={background ? { background } : undefined}>
      {kicker ? <p className="hero__kicker">{kicker}</p> : null}
      {title ? <h1 className="hero__title">{title}</h1> : null}
      {sub ? <p className="hero__sub">{sub}</p> : null}
      {children}
    </section>
  );
}
