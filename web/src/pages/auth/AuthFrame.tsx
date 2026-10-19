// Cadre des pages d'entrée (connexion, inscription, mot de passe oublié) : logo, formulaire centré, liens légaux.
import { ArrowLeft } from 'lucide-react';
import { ReactNode, useEffect } from 'react';
import { Link } from 'react-router';
import crest from '../../assets/crest.png';
import { Kicker } from '../../ui/ui';

export function AuthFrame({ title, kicker, sub, children }: { title: string; kicker?: string; sub?: ReactNode; children: ReactNode }) {
  useEffect(() => {
    document.title = `${title} · Supercity`;
  }, [title]);
  return (
    <div className="auth">
      <header className="auth__top">
        <Link to="/" className="auth__back" aria-label="Retour à l'accueil">
          <ArrowLeft size={20} aria-hidden />
        </Link>
        <Link to="/" className="auth__logo">
          <img src={crest} alt="" width={36} height={36} />
          Supercity
        </Link>
      </header>
      <main className="auth__card">
        <div className="stack" style={{ gap: 4 }}>
          {kicker ? <Kicker>{kicker}</Kicker> : null}
          <h1 className="auth__title">{title}</h1>
          {sub ? <p className="sub">{sub}</p> : null}
        </div>
        {children}
      </main>
      <footer className="welcome__footer">
        <Link to="/help">Aide</Link>
        <Link to="/cgu">Conditions</Link>
        <a href="/confidentialite/">Confidentialité</a>
        <Link to="/mentions">Mentions légales</Link>
      </footer>
    </div>
  );
}
