// Filet de sécurité : si une page plante, on l'affiche à la place de la page au lieu de vider tout l'écran.
import { Component, ReactNode } from 'react';

const RELOADED = 'supercity_chunk_reload';

/** Fichier de page introuvable : souvent une nouvelle version mise en ligne pendant la visite. */
function isChunkError(e: Error) {
  return /dynamically imported module|Importing a module script failed|Failed to fetch|error loading dynamically/i.test(e.message);
}

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error(error);
    // Une seule tentative de rechargement, pour ne pas boucler si le fichier manque vraiment.
    try {
      if (isChunkError(error) && !sessionStorage.getItem(RELOADED)) {
        sessionStorage.setItem(RELOADED, '1');
        window.location.reload();
      }
    } catch {
      /* stockage indisponible */
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="page">
        <div className="card stack" style={{ gap: 12 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Oups, cette page a planté</h2>
          <p className="sub" style={{ margin: 0 }}>Recharge la page. Si ça recommence, envoie-nous ce message :</p>
          <code style={{ fontSize: 13, padding: 10, borderRadius: 10, background: 'var(--tint)', wordBreak: 'break-word' }}>{error.message}</code>
          <div className="row">
            <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
              Recharger
            </button>
            <a className="btn btn--ghost" href="/app/">
              Retour à l'accueil
            </a>
          </div>
        </div>
      </div>
    );
  }
}
