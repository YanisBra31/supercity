// Écran d'entrée avant connexion, façon X : grand titre, inscription, connexion directe, blason en grand.
import { Volleyball } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router';
import crest from '../../assets/crest.png';
import icon from '../../assets/icon.png';
import { ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth';

export default function Welcome() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = 'Supercity · Ça joue près de chez toi';
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Connexion impossible.');
      setLoading(false);
    }
  };

  return (
    <div className="welcome">
      <div className="welcome__main">
        <div className="welcome__left">
          <form className="welcome__form" onSubmit={submit}>
            <img src={crest} alt="" className="welcome__mini" width={72} height={72} />
            <h1 className="welcome__title">
              Ça joue près
              <br />
              de chez toi<span>.</span>
            </h1>
            <p className="welcome__sub">Inscris-toi, c'est gratuit.</p>
            <Link to="/register" className="welcome__white">
              <Volleyball size={20} aria-hidden />
              Créer mon compte
            </Link>
            <div className="welcome__or">
              <span />
              ou connecte-toi
              <span />
            </div>
            <input className="welcome__input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Adresse e-mail" aria-label="Adresse e-mail" autoComplete="email" required />
            <input className="welcome__input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe" aria-label="Mot de passe" autoComplete="current-password" required />
            {error ? <p className="welcome__error" role="alert">{error}</p> : null}
            <button type="submit" className="btn btn--primary btn--block welcome__go" disabled={!email.trim() || !password || loading}>
              {loading ? <span className="spinner" aria-label="Connexion…" /> : 'Se connecter'}
            </button>
            <Link to="/forgot" className="welcome__forgot">
              Mot de passe oublié ?
            </Link>
            <p className="welcome__legal">
              En continuant, tu acceptes les <Link to="/cgu">Conditions d'utilisation</Link> et la <a href="/confidentialite/">Politique de confidentialité</a>.
            </p>
          </form>
        </div>
        <div className="welcome__right" aria-hidden>
          <svg className="welcome__pitch" viewBox="0 0 820 510" fill="none" stroke="currentColor" strokeWidth="3">
            <rect x="4" y="4" width="812" height="502" rx="6" />
            <line x1="410" y1="4" x2="410" y2="506" />
            <circle cx="410" cy="255" r="70" />
            <rect x="4" y="135" width="110" height="240" />
            <rect x="706" y="135" width="110" height="240" />
          </svg>
          <img src={crest} alt="" className="welcome__crest" />
          <div className="welcome__card">
            <img src={icon} alt="" width={48} height={48} />
            <div>
              <b>Sur ton téléphone</b>
              <span>Ouvre supercity.fr/app et ajoute-la à ton écran d'accueil. Appli iOS et Android bientôt.</span>
            </div>
          </div>
        </div>
      </div>
      <footer className="welcome__footer">
        <a href="/decouvrir/">Découvrir Supercity</a>
        <Link to="/help">Aide</Link>
        <Link to="/cgu">Conditions</Link>
        <a href="/confidentialite/">Confidentialité</a>
        <Link to="/mentions">Mentions légales</Link>
        <span>© 2026 Supercity</span>
      </footer>
    </div>
  );
}
