// Grade et carte joueur dans un seul encart, avec un onglet pour passer de l'un à l'autre.
// Le grade s'affiche d'abord ; la carte se retourne à chaque fois qu'on y arrive.
import { KeyboardEvent, ReactNode, useState } from 'react';

export function ProfileCards({ pages }: { pages: { title: string; render: (visit: number) => ReactNode }[] }) {
  const [page, setPage] = useState(0);
  const [visits, setVisits] = useState<number[]>(() => pages.map(() => 0));
  if (!pages.length) return null;
  if (pages.length === 1) return <>{pages[0].render(0)}</>;
  const go = (i: number) => {
    if (i === page) return;
    setPage(i);
    setVisits((v) => v.map((n, k) => (k === i ? n + 1 : n)));
  };
  // Flèches gauche et droite pour changer d'onglet au clavier.
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') go((page + 1) % pages.length);
    if (e.key === 'ArrowLeft') go((page - 1 + pages.length) % pages.length);
  };
  const current = pages[page] ?? pages[0];
  return (
    <section className="pcards">
      <div className="pcards__tabs" role="tablist" onKeyDown={onKey}>
        {pages.map((p, i) => (
          <button key={p.title} type="button" role="tab" aria-selected={page === i} tabIndex={page === i ? 0 : -1} className="pcards__tab" onClick={() => go(i)}>
            {p.title}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="pcards__panel" key={page}>
        {current.render(visits[page] ?? 0)}
      </div>
    </section>
  );
}
