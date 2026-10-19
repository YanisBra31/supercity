// Aide : les questions fréquentes, regroupées par thème, avec une recherche et un contact. ?q=<id> ouvre une question.
import { ChevronDown, Mail, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { HELP, HELP_EMAIL } from '../data/help';
import { Page } from '../ui/Layout';
import { Hero } from '../ui/hero';
import { Kicker } from '../ui/ui';

// Recherche sans accents ni majuscules : « remboursement » trouve « Remboursé ».
const plain = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function Help() {
  const [params] = useSearchParams();
  const asked = params.get('q');
  const [search, setSearch] = useState('');
  const words = plain(search).split(/\s+/).filter(Boolean);
  const topics = HELP.map((t) => ({ ...t, items: t.items.filter((i) => words.every((w) => plain(`${i.q} ${i.a}`).includes(w))) })).filter((t) => t.items.length);

  // Question demandée depuis un lien : on la fait défiler à l'écran.
  useEffect(() => {
    if (asked) document.getElementById(`q-${asked}`)?.scrollIntoView({ block: 'center' });
  }, [asked]);

  return (
    <Page title="Aide">
      <Hero kicker="Aide" title="Une question ?" sub="Les réponses aux questions qu'on nous pose le plus." />
      <div className="field__box help-search">
        <Search size={18} aria-hidden style={{ color: 'var(--dim)' }} />
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rembourser, grade, pièces..." aria-label="Chercher dans l'aide" />
      </div>
      {topics.map((t) => (
        <section key={t.title} className="stack" style={{ gap: 8 }}>
          <Kicker>{t.title}</Kicker>
          <div className="card faq">
            {t.items.map((i) => (
              <details key={i.id} id={`q-${i.id}`} open={i.id === asked || words.length > 0}>
                <summary>
                  <span className="grow">{i.q}</span>
                  <ChevronDown size={18} aria-hidden />
                </summary>
                <p>{i.a}</p>
              </details>
            ))}
          </div>
        </section>
      ))}
      {!topics.length ? <p className="sub" style={{ textAlign: 'center' }}>Aucune réponse pour « {search} ». Écris-nous !</p> : null}
      <section className="card stack" style={{ alignItems: 'center', gap: 10, textAlign: 'center' }}>
        <b style={{ fontSize: 16 }}>Pas trouvé ta réponse ?</b>
        <a href={`mailto:${HELP_EMAIL}`} className="btn btn--dark">
          <Mail size={19} aria-hidden />
          <span className="btn__label">Écrire à Supercity</span>
        </a>
      </section>
    </Page>
  );
}
